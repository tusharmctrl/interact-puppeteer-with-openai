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
    return generalResponse(
      res,
      {
        perception: finalPerception,
        overallRatings: { trustPilot: reviews.overallRating },
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
