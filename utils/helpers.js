import readline from "readline";
export async function input(promptText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  console.log(promptText);
  const multilineInput = [];
  return new Promise((resolve) => {
    rl.on("line", (line) => {
      if (line === "") {
        rl.close();
      } else {
        multilineInput.push(line);
      }
    });
    rl.on("close", () => {
      resolve(multilineInput.join("\n"));
    });
  });
}

export function in_array(element, array) {
  return array.includes(element);
}

export function redact_messages(messages) {
  return messages.map(({ redacted, url, content, ...rest }) => {
    let newContent;
    try {
      newContent = JSON.parse(content);
    } catch {
      newContent = content;
    }
    return {
      ...rest,
      content: newContent,
    };
  });
}

export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
