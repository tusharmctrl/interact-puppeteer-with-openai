from crewai import Agent, Task, Crew
from langchain_openai import ChatOpenAI
from crewai_tools import WebsiteSearchTool , ScrapeWebsiteTool
import os 
from dotenv import load_dotenv
from textwrap import dedent

load_dotenv()
api_key = os.getenv('API_KEY')
# Model = 'gpt-3.5-turbo'
Model = 'gpt-4o'
llm = ChatOpenAI(model=Model,api_key=api_key,temperature=0)

web_rag_tool = ScrapeWebsiteTool()


review_retriever = Agent(
    role='Trustpilot.com Reviews Retriever',
    goal="Your role is to conduct a thorough analysis of customer reviews for a specified website on Trustpilot.com. By navigating through paginated reviews and comprehensively examining user feedback, your goal is to provide an insightful summary of the website's reputation and customer satisfaction. Your descriptive analysis will offer valuable insights into the strengths, weaknesses, and overall perception of the website among its users.",
    backstory="With a background in market research and a specialization in online review analysis, you bring extensive experience in interpreting qualitative data and identifying trends.",
    tools=[web_rag_tool],
    verbose=True,
    llm = llm
)

reviewes_examiner = Agent(
    role='Examiner of Provided Reviews by review_retriever agent',
    goal="Your task is to analyze the reviews we have received from review_retriever agent. For each journey, you need to review all the feedback and determine if the customers are satisfied. Your goal is to extract insights from the reviews and assess whether the journey meets customer expectations. You will identify key trends, positive highlights, and areas needing improvement. Your analysis will help us understand customer sentiments and make informed decisions to enhance our services. By thoroughly examining each review, you will ensure that we address any issues and continue to provide a high-quality experience for our customers.",
    backstory="""With a background in user experience in platform, you bring extensive experience in examining user reviews and get the output accordingly for any specialised category. Your expertise allows you to extract meaningful insights from diverse customer feedback, helping businesses understand consumer sentiment and make informed decisions. Your work contributes directly to enhancing the website's understanding of customer perceptions and improving its overall customer experience strategy. You have to review all the customer reviews and then generate a short desciption for each category / journey from those reviews.
    We have following categories - review all the user feedbacks and categorise those reviews under following categories, 
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
    """,
    verbose=True,
    llm = llm
)

reviews = Task(
    description=dedent(f"""
        Please conduct a comprehensive analysis of stake.com using Trustpilot.com, ensuring coverage of all languages by adding "?languages=all" to the URL parameter.Strictly Navigate through each paginated page of reviews by adding parameters like '?page=2', '?page=3', up to '?page=2' to ensure thorough research."""),
    expected_output=dedent(f"""A list of 20 reviews you've read from Trustpilot.com, along with user I would also like to get the reviews given by them and it should be a full review not the truncated ones.
      Please ensure your response includes specific examples or anecdotes from reviews to support your analysis and provide a nuanced understanding of user sentiment.                       
    """),
    agent=review_retriever)

organiser = Task (
    description=dedent(f""" Please carefully examine all the reviews we have received and categorize them based on the specified journey. Once categorized, generate a summary for each journey, describing the feedback we have received."""),
    expected_output=dedent(f"""Please carefully examine all the reviews we have received and sort them into the specified categories. For each category, make a list of the reviews that belong to it. Once you have categorized all the reviews, write a summary for each category, describing how the journeys have been based on user feedback. Include key points about what users liked and what needs improvement. This analysis will help us understand customer satisfaction and improve our services. In output you should provide both of these things, categorised reviews and summaries as well. Reviews should be same as it is as user has written and in summary of each journey you should showcase positive / negative sides.                   
    """),
    agent=reviewes_examiner
)

crew = Crew(
    agents=[review_retriever, reviewes_examiner],
    tasks=[reviews, organiser],
    verbose=True
)

# Execute tasks
result = crew.kickoff()
print(result)
