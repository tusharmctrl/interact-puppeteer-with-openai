import {
  PERCEPTION_SYSTEM_PROMPT,
  REVIEW_USER_PROMPT,
} from "../constants/prompts.js";
import { fetchOpenAIResponse } from "../services/openai.js";
import { generalResponse } from "../utils/helpers.js";
import { scrapeReviews } from "../utils/puppeteer.js";

export const trustPilot = async (req, res) => {
  try {
    const reviews = await scrapeReviews(req.query.url);
    const assessmentId = "777102ce-b6c1-415e-8948-dc6eb91f08fd" // we need to make this one dynamic.
    const formattedReviews = reviews.reviews.map((data, index) => ({
      ...data,
      review_id: index,
      review_text: data.review_text.replace(/"/g, ""),
    }));
    const reviewsResponse = await fetchOpenAIResponse({
      messages: [
        {
          role: "system",
          content: PERCEPTION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: REVIEW_USER_PROMPT(formattedReviews),
        },
      ],
      temperature: 0,
      json_response: true,
    });
    const gptData = JSON.parse(reviewsResponse.choices[0].message.content);
    const perception = gptData.perception;
    const finalPerception = perception.map((data) => {
      const reviewsFromGPT = data.Reviews;
      const detailedReviews = reviewsFromGPT.map((review) => {
        const scrapedReview = formattedReviews.find(
          (fr) => fr.review_id === review.review_id
        );
        return {
          title: scrapedReview.review_title,
          detailed_review: scrapedReview.review_text,
          rating: scrapedReview.review_rating,
        };
      });
      return {
        ...data,
        Reviews: detailedReviews,
      };
    });
    const dataToBeStoredInTable = finalPerception.map((perception) => {
      return {
        assessment_id: assessmentId,
        s_category_id: 3,
        s_sub_category_id: perception.journey_id,
        sub_category_name: perception.journey,
        category_name: "Perception"
        perception_assessments: {
          data: [{
            summary_positive: perception.Summary?.positive,
            summary_negative: perception.Summary?.negative,
            proposition_reviewed_percent: perception.proposition?.total_reviewed_from,
            proposition_sentiment_positive: parseFloat(perception.proposition?.sentiment?.positive),
            proposition_sentiment_negative: parseFloat(perception.proposition?.sentiment?.negative),
            proposition_sentiment_neutal: parseFloat(perception.proposition?.sentiment?.neutral),
            medium: "TRUSTPILOT",
            overall_rating: reviews.overallRating,
            perception_assessment_review_trustpilots: {
              data: perception?.Reviews
            }
          }]
        }
      }
    })
    return generalResponse(
      res,
      {
        perception: dataToBeStoredInTable
      },
      "Reviews Scraped Successfully!",
      "success",
      true,
      200
    );
  } catch (error) {
    console.log(error);
    return generalResponse(
      res,
      null,
      "Something went wrong while performing perception operations.",
      "error",
      true,
      400
    );
  }
};

