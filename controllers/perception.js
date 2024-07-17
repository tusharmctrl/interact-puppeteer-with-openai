import { fetchOpenAIResponse } from "../services/openai.js";
import { generalResponse } from "../utils/helpers.js";
import { scrapeReviews } from "../utils/puppeteer.js";

export const trustPilot = async (req, res) => {
  try {
    const reviews = await scrapeReviews(req.query.url);
    const formattedReviews = reviews.reviews.map((data) => ({
      ...data,
      review_text: data.review_text.replace(/"/g, ""),
    }));
    const reviewsResponse = await fetchOpenAIResponse({
      messages: [
        {
          role: "system",
          content: `With a background in user experience in platform, you bring extensive experience in examining user reviews and get the output accordingly for any specialised category. Your expertise allows you to extract meaningful insights from diverse customer feedback, helping businesses understand consumer sentiment and make informed decisions. Your work contributes directly to enhancing the website's understanding of customer perceptions and improving its overall customer experience strategy. You have to review all the customer reviews and then generate a short desciption for each category / journey from those reviews.
          We have following categories - review all the user feedbacks and categorise those reviews under following categories, 
          1. Entry and Home page related: Initial interaction with the website, including first impressions and overall layout navigation.
          2. Registration: The process of creating a new user account, including entering personal information and completing verification steps.
          3. Signing-in: The action of logging into an existing account, involving username and password input or other authentication methods.
          4. Getting Help: Seeking assistance through customer support or navigating the help section for troubleshooting and inquiries.
          5. Design & Performance: The visual appeal, usability, and technical efficiency of the website, including load times and responsiveness.
          6. Depositing: Adding funds to a user account through various payment methods.
          7. Finding Games: Browsing and selecting from available game options on the platform.
          8. Playing Games: The experience of engaging with and participating in games on the site.
          9. Withdrawal: The process of removing funds from a user account to a bank or other payment method.
          10. Using Bonus and Promotions: Accessing and applying special offers, bonuses, and promotional deals provided by the platform.
          If a review doesn't fit into any of the above categories, classify it under a new category called "General.`,
        },
        {
          role: "user",
          content: `Please carefully examine all the reviews we have provided you and categorize them based on the specified journey. Once categorized, generate a summary for each journey, describing the feedback we have received. Please carefully examine all the reviews we have provided and sort them into the specified categories. For each category, make a list of the reviews that belong to it. Once you have categorized all the reviews, write a summary for each category, describing how the journeys have been based on user feedback. Include key points about what users liked and what needs improvement. This analysis will help us understand customer satisfaction and improve our services. In output you should provide both of these things, categorised reviews and summaries as well. Reviews should be same as it is as user has written and in summary of each journey you should showcase positive / negative sides.  
          You should provide an answer in following JSON objects.
          Here is the list of all reviews:
          ${JSON.stringify(formattedReviews)}
          I would also like to get proposition of each journey as well. For example: Registrating journey is "10%" of all the reviews you have analyzed, then - sentiment, 20% of all the reviews you have analyzed for Registration journey is positive, 50% is negative and 30% is you can not identify. In response it's alright if you're not giving entire text of "reviewText" truncated text till 200-250 characters is okay.
          Expected Output:
          {
            data: [{journey: "Register", Reviews: [{user: "username", reviewText: "text", rating: "1/5"}], Summary: {positive: "", negative: ""}, proposition: {total_reviewed_from: "10%", sentiment: {positive: "20%", negative: "50%", no_idea: "30%"}}}, {journey: "Entry and Homepage", Reviews: [{user: "username", reviewText: "text", rating: "1/5"}], Summary: {positive: "", negative: ""}}]
          }
          `,
        },
      ],
      temperature: 0,
      json_response: true,
    });

    const gptData = JSON.parse(reviewsResponse.choices[0].message.content);
    return generalResponse(
      res,
      gptData,
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
      "Something went wrong while performing home page journey",
      "error",
      true,
      400
    );
  }
};
