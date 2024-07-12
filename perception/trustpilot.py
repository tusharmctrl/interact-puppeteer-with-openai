from crewai import Agent, Task, Crew
from langchain_openai import ChatOpenAI
from crewai_tools import WebsiteSearchTool , ScrapeWebsiteTool
import os 
from dotenv import load_dotenv
from textwrap import dedent

load_dotenv()
api_key = os.getenv('API_KEY')
Model = 'gpt-4o'
llm = ChatOpenAI(model=Model,api_key=api_key,temperature=0)

def get_user_input():
    url = input("Please enter the URL of the website you want to analyze on Trustpilot.com: ")
    return url

url = get_user_input()

web_rag_tool = ScrapeWebsiteTool()

researcher = Agent(
    role='Trustpilot.com Review Analyst',
    goal="Your role is to conduct a thorough analysis of customer reviews for a specified website on Trustpilot.com. By navigating through paginated reviews and comprehensively examining user feedback, your goal is to provide an insightful summary of the website's reputation and customer satisfaction. Your descriptive analysis will offer valuable insights into the strengths, weaknesses, and overall perception of the website among its users.",
    backstory="With a background in market research and a specialization in online review analysis, you bring extensive experience in interpreting qualitative data and identifying trends. Your expertise allows you to extract meaningful insights from diverse customer feedback, helping businesses understand consumer sentiment and make informed decisions. Your work contributes directly to enhancing the website's understanding of customer perceptions and improving its overall customer experience strategy.",
    tools=[web_rag_tool],
    verbose=True,
    llm = llm
)

research = Task(
    description=dedent(f"""
        Please conduct a comprehensive analysis of {url} using Trustpilot.com, ensuring coverage of all languages by adding "?languages=all" to the URL parameter.Strictly Navigate through each paginated page of reviews by adding parameters like '?page=2', '?page=3', up to '?page=5' to ensure thorough research.
        Summarize your findings, focusing on user experiences and excluding terms and conditions for learning purposes only.
        Please include in your summary:
        1. An overview of the site’s aggregate rating based on all reviewed pages and languages.
        2. Key themes in user feedback, highlighting positives, concerns, and specific examples.
        3. Recurring sentiments or examples from reviews that reflect user satisfaction or dissatisfaction.
        4. Notable trends or insights that emerge from the analyzed reviews across languages.
        5. Recommendations or insights for improving customer satisfaction based on your findings.

Ensure your analysis is detailed and supported by specific examples or anecdotes from the reviews to provide a comprehensive understanding of user sentiment across languages.
"""),

    expected_output=dedent(f"""Please provide: 
    1. Please provide a detailed summary of your findings based on all customer reviews from Trustpilot.com, including the site's rating and user experience:
    2.Site Rating: Based on your analysis of Trustpilot reviews, what is the numerical rating and how does it reflect the overall perception of the site?
    3.User Experience: Describe the predominant themes in user feedback regarding their experiences with the site. Highlight specific aspects such as customer service, product quality, ease of use, and reliability. Include any noteworthy positive or negative trends that emerged across reviews.
    3.Customer Sentiment: Provide insights into the emotional tone of the reviews. How do users generally feel about their interactions with the site? Are there any recurring sentiments of satisfaction, frustration, or other notable emotions expressed in the reviews?
    4.Key Strengths and Weaknesses: Based on the reviews, what are the main strengths that users appreciate about the site? Conversely, what are the primary areas of improvement or concerns raised by reviewers?
    5.Conclusion: Based on your comprehensive analysis, summarize the overall reputation of the site among Trustpilot users. What recommendations or insights can be drawn to enhance the site's customer experience based on the feedback received?
    6.The total number of reviews you have examined.
    7. A list of 50 reviews you've read from Trustpilot.com - along with this I would also like to get user's name and the stars they have given and the review they have written too.
      Please ensure your response includes specific examples or anecdotes from reviews to support your analysis and provide a nuanced understanding of user sentiment. 
    Once we have received all the feedbacks, 
    1. Entry and Home page related
    2. Registration
    3. Signing-in
    4. Getting Help
    5.Design & Performance
    6. Depositing
    7. Finding Games
    8. Playing Games
    9. Withdrawal
    10. Using Bonus and Promotions.    
    Once you have finished retrieving reviews from mentioned website, please categorise reviews in the above mentioned categories.
    """),
    agent=researcher,
    # allow_delegation=True
)
crew = Crew(
    agents=[researcher],
    tasks=[research],
    verbose=2
)

# Execute tasks
result = crew.kickoff()
print(result)

