export const SYSTEM_PROMPT = {
  role: "system",
  content: `
  ## OBJECTIVE ##
  You have been tasked with crawling the internet based on a task given by the user. You are connected to a web browser which you can control via function calls to navigate to pages and list elements on the page. You can also type into search boxes and other input fields and send forms. You can also click links on the page. You will behave as a human browsing the web.
  
  ## NOTES ##
  You will try to navigate directly to the most relevant web address. If you were given a URL, go to it directly. If you encounter a Page Not Found error, try another URL. If multiple URLs don't work, you are probably using an outdated version of the URL scheme of that website. In that case, try navigating to their front page and using their search bar or try navigating to the right place with links.
  
  ## WHEN TASK IS FINISHED ##
  When you have executed all the operations needed for the original task, call answer_user to give a response to the user.`.trim(),
};

export const functionDefinitions = [
  {
    name: "click_link",
    description:
      "Clicks a link with the given pgpt_id on the page. Note that pgpt_id is required and you must use the corresponding pgpt-id attribute from the page content. Add the text of the link to confirm that you are clicking the right link.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text on the link you want to click",
        },
        pgpt_id: {
          type: "number",
          description:
            "The pgpt-id of the link to click (from the page content)",
        },
      },
    },
    required: ["reason", "pgpt_id"],
  },
  {
    name: "fill_form",
    description:
      "Fills the text to input fields and optionally submit the form",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "The URL to go to (including protocol) of the form page we're about to scrap.",
        },
      },
    },
    required: ["url"],
  },
];

export const REGISTER_HEURISTIC_PROMPT = (
  device = "desktop"
) => `You have all the necessary screenshots and page content as well. Try to identify these heuristics I have given here. I want you to perform following heuristics and you have to answer them in such an array. 
  The following screenshots are for ${device} devices.
  [{title: sring, observation: string, result: "passed/failed/couldnt'determine", suggestions: string}]
  
  You have to verify all the below questions through screenshots and need to give us the JSON object with response field which contains response of yours based on that. It should be strictly an array. Title should be same as the one I am providing below, and observations should be very descriptive. Suggestions must be added to give ideas about how we can enhance the user accessibility in the platform. 
  
  - Ensure the registration Call to Action (CTA) is prominently displayed and easily accessible on all pages of the website for non-logged-in users. This CTA should be consistently visible in a fixed location, such as the header or sidebar, to guide new visitors towards account creation effortlessly. Improve user conversion rates by testing different CTA placements. Where possible, ensure that the CTA is always visibile to the user (perhaps via a sticky header) and only one-click away. Ensuring the registration call-to-action (CTA) is clearly visible and one-click away for the user across the website will encourage new users to sign up.

  - Ensure the registration area opens in the same tab or window, providing a seamless user experience without redirecting users to a new tab, window, or modal/popup. This maintains continuity and reduces potential confusion during the registration process. Users expect the registration process to occur within the same page or tab they are currently interacting with, ensuring a seamless and uninterrupted experience. If the registeration form is appearing in the modal, mark the heuristic as failed.
  
  - Ensure the registration page content is straightforward and easy to understand. Instructions and required actions should be immediately clear at first glance, enabling users to effortlessly complete the registration process. The registration page content should be straightforward, logical and easy to understand, ensuring that users can immediately recognize and understand what actions they need to take without confusion or unecessary steps. Simplify the language used on the registration page, utilize visual cues like icons or progress bars, employ clear and concise instructions, to avoid any confusion for users.
  
  - Ensure the registration process maintains user control and awareness. For multi-step registrations, include clear visual indicators that show users their current step, the total number of steps, and the remaining steps. Additionally, provide a brief summary of each step at the beginning to prepare users for the required information or actions. Incorporate intuitive navigation controls, such as "Next," "Back," and "Save" buttons, to facilitate easy movement through the steps. Use real-time validation and feedback to confirm accurate information entry and reduce errors. This comprehensive approach ensures users understand their progress and what to expect next, enhancing their overall experience and satisfaction.
  
  - Ensure that the registration process includes easily accessible live help options. Does it Integrate features like live chat or instant customer support access, ensuring users can get immediate assistance at any point during the registration. Ensure links to live help features, such as chatbots or instant customer service access, are prominently displayed and easily accessible during the registration process to minimize friction and improve user experience. Generally the option of live help is placed at right bottom side in the page.
  
  - Review the registration form to confirm it is simple and user-friendly. Ensure that there are no unnecessary fields, incoherent groupings, or illogical orderings, providing a streamlined registration experience for users. Check if there are any unnecessary fields, ensure logical grouping of fields, and maintain a logical order to streamline the user registration process.
  
  - Review the registration form to confirm that all fields include appropriate hints, guidelines, or examples to demonstrate the expected input. This helps users understand exactly what information is required, enhancing the overall registration experience. Fields should include hints, guidelines, or examples to show users the correct format and type of information required, reducing input errors and improving overall user experience.
  
  - Review the registration form to ensure that fields are designed appropriately. It uses pull-down menus, radio buttons, and checkboxes in preference to text entry fields where applicable. This simplifies data entry and improves the user experience. make sure that this heuristic ensures that appropriate input form fields are designed to minimize user effort and errors. By using pull-down menus, radio buttons, and checkboxes instead of text entry fields, users can quickly and easily make selections, reducing cognitive load and the likelihood of input mistakes.
  
  - Review the registration form to ensure there is a clear distinction between 'required' and 'optional' fields. This helps users understand which information is mandatory and which is optional, improving the overall registration experience. Most of the times
  required sign will have (*) beside the label and optional field will have (optional) written at the side to the label.
  
  - Review the registration form to ensure that all text boxes are appropriately sized for the expected input. For example, the age text box should be short, while the name text box should have a suitable width to accommodate longer entries. This largely depends how our form will look like. How our user experience would be. it should be appropriately sized to match the expected input length, ensuring users are guided on how much information is required and can clearly read what they have input without needing to scroll through a short text field.
  
  - Ensure that data formats are clearly indicated for input (e.g., dates) and output (e.g., units of values) in the registration form. Use appropriate fields and labels, such as date pickers for dates and numerical input fields for numbers, to enhance user understanding and input accuracy. It enhances usability by ensuring users understand the expected format and units, reducing errors and frustration. 
  
  - Ensure that users can complete simple tasks by entering only essential information, with the system automatically providing non-essential information by default. This simplifies the user experience and streamlines the completion of tasks. as the system automatically fills in non-critical data. For example, if the user has selected a country previously, the country code for mobile phone should be auto completed.
  
  - Ensure there is a clearly visible password strength indicator that includes expected security parameters, such as the use of different symbols. This helps users create strong and secure passwords. Password indicator should contain appropriate colors, such
  as green if it's secure and matching all the criterias, red to the parts where they're not matched. This element helps in educating users on creating secure passwords and reinforces security requirements in real-time.
  
  - The correct heuristic should be focused on providing useful error messaging when fields are input incorrectly, in the moment. It ensures users receive clear and actionable feedback immediately when they make mistakes while filling out forms or input fields.
  
  I have attached 6 screenshots which represents follwing actions:
  1. Home Page Desktop
  2. Home Page Mobile
  3. Register Form Before Filling Up Desktop
  4. Register Form Before Filling Up Mobile
  5. Register Form After Filling Up Desktop
  6. Register Form After Filling Up Mobile
  `;

export const LOGIN_HEURISTIC_PROMPT = (
  device = "desktop"
) => `You have all the necessary screenshots and page content as well.
  The screenshots attached here are for ${device} devices, try to evaluate them accordingly.
  Try to identify these heuristics I have given here. I want you to perform following heuristics and you have to answer them in such a JSON array object. 
  {data: [{title: sring, observation: string, result: "passed/failed/couldnt'determine", suggestions: string}]}
  You have to verify all the below questions through screenshots and need to give us the JSON object with response field which contains response of yours based on that. It should be strictly an array. Title should be same as the one I am providing below, and observations should be very descriptive. Suggestions must be added to give ideas about how we can enhance the user accessibility in the platform. 
  I want you to thoroughly examine all the screenshots I am providing you here - and based on them give an answer. 
  
  - Ensure that the 'Sign In' button is easy to see on every page of the website. 
  Most of the time, 'Sign In' button should be on header / sidebar.
  It should always be in a clear and noticeable spot so users can easily find it no matter where they are on the site. Additionally, users should be able to sign in using a combination of their username or email and password.
  
  - Ensure there is an accessible and straightforward process for users to recover forgotten passwords. 
  This process should be easy to find, simple to follow, and provide clear instructions to help users reset their passwords quickly and securely. Forgot password should be at below the login form.
  
  - Ensure there is an accessible and straightforward process for users who have forgotten their email addresses. 
  This process should be easy to find, simple to follow, and provide clear instructions to help users recover or verify their email addresses quickly and securely. Forgot email address should be at below the login form. There shouldn't be confusion between retrieving an email and retrieving a password. Email also comes under a "login details" module.
  
  - Ensure there is an option for users to 'Remember My Details'. This feature should be prominently available, allowing users to conveniently save their login credentials for future visits, thereby enhancing usability and user experience on the website. Most of the times, there should be a checkbox of "Remember Me" at the bottom of login form.
  
  - Ensure the site features helpful error messaging that triggers only when fields are incorrectly input, ensuring users receive clear guidance to correct mistakes effectively. This approach prevents confusion and enhances user experience by facilitating smooth interactions throughout the site. 
  
  - Ensure CAPTCHA or other anti-bot measures are implemented during sign-in to enhance security and prevent automated attacks, thereby safeguarding user accounts and maintaining the integrity of the login process. They're usually powered by google recaptcha or cloudfare.
  
  - Ensure that error messaging is clear and concise, providing users with specific reasons for the error encountered and clear instructions on the next steps to resolve the issue effectively. This approach enhances user understanding and facilitates smoother navigation and interaction on the site.
  
  These are the heuristics which needs to be tested.
  `;

export const prompt = (cords) => `Task Description:
  I have a set of coordinates that correspond to form elements on a webpage. I need to identify the type of form element (e.g., textbox, selectbox, checkbox, radio button) at each coordinate and generate a sample value for each form element. Here are the specific instructions:
  
  1. Identify Form Elements:
  - For each coordinate, locate the corresponding form element on the provided screenshot of the webpage.
  - Determine the type of form element at each coordinate.
  
  2. Generate Output:
  - Create an array of objects, where each object has the following keys:
  -- location: An object with x and y coordinates.
  -- element_type: A string indicating the type of form element (e.g., "textbox", "selectbox", "checkbox", "radio button").
  -- value: A sample value relevant to the type of form element.
  
  3. Handling Non-form Elements:
  - If a coordinate does not correspond to a form element, skip it and do not include it in the output array.
  
  Example Output in json array format:
  ###
  {
      fields: [
          {
              "location": {"x": 875, "y": -1476},
              "element_type": "selectbox",
              "value": "Country of residence"
          },
          {
              "location": {"x": 1063, "y": -1476},
              "element_type": "selectbox",
              "value": "Currency"
          },
          {
              "location": {"x": 951.5, "y": -1420},
              "element_type": "textbox",
              "value": "test@example.com"
          },
          // ... additional objects for other coordinates
      ]
  }
  ###
  
  Coordinates and Screenshot:
  Coordinates:
  ###
  ${JSON.stringify(cords)}
  ###
  
  Screenshot is attached in the prompt
  
  Notes:
  - Ensure accuracy by cross-referencing each coordinate with the corresponding form element in the screenshot. please go through all the coordinates precisely and make sure you only recommend what you see on any given coordinates, don't just assume the next field and provide the value irrespective of the coordinates. Also don't skip/change the field if you see same field type of different coordinates. I want accurate field value and element_type on each given coordinate that shouldn't be impected by your knowledge base of other form layouts.
  - Use realistic dummy values for the form elements based on their type in the json response.`;

export const prompt2 = (cords) => `
  I am attaching here a bunch of coordinates I have extracted of all the form elements on the page and also attaching the screenshot of the page.
  You need to go through all this coordinates and find the loaction of the same on hte screenshot, on the given coordinate if you see a possible form element then create a relevant value for it.
  Also you have to give us unique selector for each of the input element. Remember you're supposed to give selector for input element. Not the parent ones such as div or span. It could be input, textarea or select. Just give us unique identifier for each of these three. 
  In selector if you're returning a name then it should be [name="email], if you're returning id of an element then it should be [id="test1"] if none of these exist - there must be data attribute take that.
  One thing - you should not create your own selectors if you're not able to identify from the given element.
  HTML content resides inside the element property in the mentioned JSON.
  If given loaction doesn't look like a form element then just skip it. Just search each coordinate one by one and generate value relevant
  to what you see at that location, strictly do not merge two field, don't just assume the next field and provide the value irrespective of the coordinates.
  
  All I want in output is json array of objects, where object will have following keys and object represent each coordinates
  
  {
      fields: [
          {
              loaction: {x:0,u:0},
              selector: "email"
              element_type: "textbox" // textbox, selectbox, checkbox, radiobutton, textarea
              value: "John"
          }
      ]
  }
  
  Here's the json of the coordinates
  ${JSON.stringify(cords, "", 1)}
  `;

export const ENTRY_HOMEPAGE_HEURISTICS = `
  Based on the screenshot I have provided, Try to identify these heuristics I have given here. I want you to perform following heuristics and you have to answer them in such a JSON array object. 
  {data: [{title: sring, observation: string, result: "passed/failed/couldnt'determine", suggestions: string}]}
  
  You have to verify all the below questions through screenshots and need to give us the JSON object with response field which contains response of yours based on that. It should be strictly an array. Title should be same as the one I am providing below, and observations should be very descriptive. Suggestions must be added to give ideas about how we can enhance the user accessibility in the platform. 
  I want you to thoroughly examine all the screenshots I am providing you here - and based on them give an answer. 
  
  # Website Homepage Best Practices
  - Ensure the value proposition is clearly stated on the home page, prominently featuring a compelling tagline or welcome blurb. This should quickly communicate the core benefits and unique offerings of the website to new and returning users, effectively capturing their interest and encouraging further exploration.
  - Ensure the design of the home page is engaging and intuitive, encouraging visitors to explore the site further. This includes using appealing visuals, clear navigation, and strategically placed calls-to-action to guide users seamlessly through the site's offerings.
  - Ensure the home page is professionally designed to create a positive first impression. It should feature high-quality visuals, a clean layout, and cohesive branding, all of which contribute to an attractive and trustworthy appearance that captivates and retains visitors.
  - Ensure product categories are provided and clearly visible on the homepage. They should be prominently displayed, easy to identify, and intuitively organized, allowing users to quickly find and navigate to the products or services they are interested in.
  - Ensure the home page includes dynamic and real-time content, such as a "Most Popular" or similar section. This feature should highlight trending products or services, providing users with up-to-date information and encouraging engagement with current popular items.
  - Ensure the items on the home page are clearly focused on users' key tasks, avoiding "featuritis" or unnecessary clutter. The design should prioritize essential features and functionalities, guiding users towards their primary objectives efficiently and without distraction.
  - Ensure navigation choices are ordered in the most logical or task-oriented manner, with essential options prioritized at the top. Less critical or corporate information should be placed towards the bottom, ensuring users can quickly access and navigate to the most relevant sections or actions they seek on the website.
  - Ensure licensing, regulatory, and security information is prominently displayed to establish trust and credibility with users. This transparency assures visitors of compliance with relevant regulations, the security measures in place to protect their data, and the legitimacy of the website's operations, fostering confidence and a positive user experience.
  - Ensure current promotions, bonuses, and special offers or something similar things are prominently displayed to attract and engage users effectively. This visibility helps capture attention, encourages users to explore available incentives, and enhances their overall experience on the website by highlighting valuable opportunities for savings or benefits.
  - Ensure the home page contains a prominently displayed search input box. This feature allows users to easily search for specific content, products, or information, enhancing usability and facilitating efficient navigation throughout the website.
  - Ensure the home page of the site has a memorable URL. This makes it easy for users to recall and revisit the site, enhancing brand recognition and facilitating direct access to the homepage without relying solely on search engines or bookmarks.
  - Ensure the homepage includes a link to a cookie policy or a mechanism to accept/decline the cookie policy, in compliance with EU law. This ensures transparency regarding the use of cookies, provides users with control over their data preferences, and helps maintain legal compliance and trustworthiness with regulatory standards.
  - Ensure the website supports multiple languages and currencies to cater to an international audience effectively. This feature enhances accessibility and user experience by allowing visitors from different regions to navigate the site in their preferred language and view prices in their local currency, thereby expanding the site's reach and accommodating diverse user preferences.
  `;

export const PERCEPTION_SYSTEM_PROMPT = `With a background in user experience in platform, you bring extensive experience in examining user reviews and get the output accordingly for any specialised category. Your expertise allows you to extract meaningful insights from diverse customer feedback, helping businesses understand consumer sentiment and make informed decisions. Your work contributes directly to enhancing the website's understanding of customer perceptions and improving its overall customer experience strategy. You have to review all the customer reviews and then generate a short desciption for each category / journey from those reviews.
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
  If a review doesn't fit into any of the above categories, classify it under a new category called "General.`;

export const REVIEW_USER_PROMPT = (reviews) =>
  `Please carefully examine all the reviews we have provided you and categorize them based on the specified journey. Once categorized, generate a summary for each journey, describing the feedback we have received. Please carefully examine all the reviews we have provided and sort them into the specified categories. For each category, make a list of the reviews that belong to it. Once you have categorized all the reviews, write a summary for each category, describing how the journeys have been based on user feedback. Include key points about what users liked and what needs improvement. This analysis will help us understand customer satisfaction and improve our services. In output you should provide both of these things, categorised reviews and summaries as well. Reviews should be same as it is as user has written and in summary of each journey you should showcase positive / negative sides.  
    You should provide an answer in following JSON objects. Here is the list of all reviews:
    ${JSON.stringify(reviews)}
    I would also like to get proposition of each journey as well. For example: Registrating journey is "10%" of all the reviews you have analyzed, then - sentiment, 20% of all the reviews you have analyzed for Registration journey is positive, 50% is negative and 30% is you can not identify. In response we just need to get the ID of review, no need to drop entire review_text and any rating, just review_id is enough for us.
    Expected Output:
    {
      perception: [{journey: "Register", Reviews: [{review_id: 1}, {review_id: 4} ], Summary: {positive: "", negative: ""}, proposition: {total_reviewed_from: "10%", sentiment: {positive: "20%", negative: "50%", neutral: "30%"}}}, {journey: "Entry and Homepage", Reviews: [{review_id: 1}, {review_id: 4} ], Summary: {positive: "", negative: ""}}]
    }
  `;
