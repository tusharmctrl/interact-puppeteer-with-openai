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
  {
    name: "capture_screenshot",
    description:
      "Capture a screenshot of the given URL and provide the user with the screenshot path or any additional information they requested.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL of the webpage to capture the screenshot from.",
        },
        response: {
          type: "string",
          description:
            "The response to the user, possibly including the location of the screenshot and any additional requested information.",
        },
      },
      required: ["url", "response"],
    },
  },
];

export const REGISTER_HEURISTIC_PROMPT = `You have all the necessary screenshots and page content as well. Try to identify these heuristics I have given here. I want you to perform following heuristics and you have to answer them in such an array. 
[{title: sring, observation: string, result: "passed/failed/couldnt'determine", suggestions: string}]
You have to verify all the below questions through screenshots and need to give us the JSON object with response field which contains response of yours based on that. It should be strictly an array. Title should be same as the one I am providing below, and observations should be very descriptive. Suggestions must be added to give ideas about how we can enhance the user accessibility in the platform.

- Ensure the registration Call to Action (CTA) is prominently displayed and easily accessible on all pages of the website for non-logged-in users. This CTA should be consistently visible in a fixed location, such as the header or sidebar, to guide new visitors towards account creation effortlessly.

- Ensure the registration area opens in the same tab or window, providing a seamless user experience without redirecting users to a new tab, window, or modal/popup. This maintains continuity and reduces potential confusion during the registration process."

- Ensure the registration page content is straightforward and easy to understand. Instructions and required actions should be immediately clear at first glance, enabling users to effortlessly complete the registration process."

- Ensure that the registration process to maintain user control and awareness. Specifically, for multi-step registrations, include clear visual indicators that show users their current step, the total number of steps, and which steps are remaining. This ensures users understand their progress and what to expect next, enhancing their overall experience."

- Ensure that the registration process includes easily accessible live help options. Does it Integrate features like live chat or instant customer support access, ensuring users can get immediate assistance at any point during the registration."

- Review the registration form to confirm it is simple and user-friendly. Ensure that there are no unnecessary fields, incoherent groupings, or illogical orderings, providing a streamlined registration experience for users.

- Review the registration form to confirm that all fields include appropriate hints, guidelines, or examples to demonstrate the expected input. This helps users understand exactly what information is required, enhancing the overall registration experience.

- Review the registration form to ensure that all fields contain appropriate hints, guidelines, or examples to demonstrate the expected input. This helps users understand what information is required and how to provide it correctly, enhancing the overall registration experience."

- Review the registration form to ensure that fields are designed appropriately. It uses pull-down menus, radio buttons, and checkboxes in preference to text entry fields where applicable. This simplifies data entry and improves the user experience."

- Review the registration form to ensure there is a clear distinction between 'required' and 'optional' fields. This helps users understand which information is mandatory and which is optional, improving the overall registration experience."

- Review the registration form to ensure that all text boxes are appropriately sized for the expected input. For example, the age text box should be short, while the name text box should have a suitable width to accommodate longer entries."

- Ensure that data formats are clearly indicated for input (e.g., dates) and output (e.g., units of values) in the registration form. Use appropriate fields and labels, such as date pickers for dates and numerical input fields for numbers, to enhance user understanding and input accuracy."

- Ensure that users can complete simple tasks by entering only essential information, with the system automatically providing non-essential information by default. This simplifies the user experience and streamlines the completion of tasks."

- Ensure there is a clearly visible password strength indicator that includes expected security parameters, such as the use of different symbols. This helps users create strong and secure passwords

- Make sure the website shows clear error messages when fields are filled out incorrectly or incompletely. This helps users fix their mistakes quickly."`;

// [{
//   name: "goto_url",
//   description: "Goes to a specific URL and gets the content",
//   parameters: {
//     type: "object",
//     properties: {
//       url: {
//         type: "string",
//         description: "The URL to go to (including protocol)",
//       },
//     },
//   },
//   required: ["url"],
// },

// {
//   name: "answer_user",
//   description:
//     "Give an answer to the user and end the navigation. Use when the given task has been completed. Summarize the relevant parts of the page content first and give an answer to the user based on that.",
//   parameters: {
//     type: "object",
//     properties: {
//       summary: {
//         type: "string",
//         description:
//           "A summary of the relevant parts of the page content that you base the answer on",
//       },
//       answer: {
//         type: "string",
//         description: "The response to the user",
//       },
//     },
//   },
//   required: ["summary", "answer"],
// },

// {
//   name: "type_text",
//   description: "Types text to input fields and optionally submit the form",
//   parameters: {
//     type: "object",
//     properties: {
//       form_data: {
//         type: "array",
//         items: {
//           type: "object",
//           properties: {},
//         },
//       },
//     },
//   },
//   required: ["form_data"],
// }]

export const LOGIN_HEURISTIC_PROMPT = `You have all the necessary screenshots and page content as well. Try to identify these heuristics I have given here. I want you to perform following heuristics and you have to answer them in such a JSON array object. 
{data: [{title: sring, observation: string, result: "passed/failed/couldnt'determine", suggestions: string}]}
You have to verify all the below questions through screenshots and need to give us the JSON object with response field which contains response of yours based on that. It should be strictly an array. Title should be same as the one I am providing below, and observations should be very descriptive. Suggestions must be added to give ideas about how we can enhance the user accessibility in the platform. 
I want you to thoroughly examine all the screenshots I am providing you here - and based on them give an answer. 

- Ensure that the 'Sign In' button is easy to see on every page of the website. 
It should always be in a clear and noticeable spot so users can easily find it no matter where they are on the site.

- Ensure that the 'Sign In' button is easy to see on every page of the website. 
It should always be in a clear and noticeable spot so users can easily find it no matter where they are on the site. Additionally, users should be able to sign in using a combination of their username or email and password.

- Ensure there is an accessible and straightforward process for users to recover forgotten passwords. 
This process should be easy to find, simple to follow, and provide clear instructions to help users reset their passwords quickly and securely.

- Ensure there is an accessible and straightforward process for users who have forgotten their email addresses. 
This process should be easy to find, simple to follow, and provide clear instructions to help users recover or verify their email addresses quickly and securely.

- Ensure there is an option for users to 'Remember My Details'. 
This feature should be prominently available, allowing users to conveniently save their login credentials for future visits, thereby enhancing usability and user experience on the website.

- Ensure the site features helpful error messaging that triggers only when fields are incorrectly input, ensuring users receive clear guidance to correct mistakes effectively. 
This approach prevents confusion and enhances user experience by facilitating smooth interactions throughout the site.

- Ensure CAPTCHA or other anti-bot measures are implemented during sign-in to enhance security and prevent automated attacks, thereby safeguarding user accounts and maintaining the integrity of the login process.

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
If given loaction doesn't look like a form element then just skip it. Just search each coordinate one by one and generate value relevant
to what you see at that location, strictly do not merge two field, don't just assume the next field and provide the value irrespective of the coordinates.

All I want in output is json array of objects, where object will have following keys and object represent each coordinates

{
    fields: [
        {
            loaction: {x:0,u:0},
            element_type: "textbox" // textbox, selectbox, checkbox, radiobutton, textarea
            value: "John"
        }
    ]
}

Here's the json of the coordinates
${JSON.stringify(cords, "", 1)}
`;
