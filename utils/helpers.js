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
  let redacted_messages = [];
  let current_url = messages[messages.length - 1].url;

  messages.forEach((message) => {
    let msg = JSON.parse(JSON.stringify(message));

    if (msg.url != current_url) {
      //msg.content = msg.redacted ?? msg.content ?? "";
    }
    delete msg.redacted;
    delete msg.url;

    try {
      msg.content = JSON.parse(msg.content);
    } catch (e) {}

    redacted_messages.push(msg);
  });

  return redacted_messages;
}

export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
