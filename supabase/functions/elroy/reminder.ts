import {
  _internals as _llmInternals,
  ChatOpenAI,
  ModelsContext,
  SystemChatMessage,
} from "../_shared/llm.ts";
import {
  REMINDER_EMAIL_PREMISE,
  STRIPE_PAYMENT_LINK,
  TEMPLATE_FOR_REMINDER_EMAIL_REQUEST,
} from "../_shared/plan.ts";
import { ElroyRequest } from "./elroy.ts";
import {
  _internals as _supabaseClientInternals,
} from "../_shared/supabaseClient.ts";

interface ResendEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
}

export interface Quote {
  content: string;
  speaker: string;
  source: string;
  link: string;
}

export interface Task {
  name: string;
  step: string;
}

export interface Reminder {
  client: string;
  task: Task;
}

interface RuntimeExpectedStrings {
  oneTime: string[];
  unlimited: string[];
}

const DEFAULT_QUOTE = {
  content: "Every action you take is a vote for the person you wish to become.",
  speaker: "James Clear",
  source: "Atomic Habits",
  link:
    "https://www.amazon.de/-/en/Atomic-Habits-life-changing-million-bestseller/dp/1847941834", // TODO: get this from the database
};

async function handleRequest(
  modelsContext: ModelsContext,
  elroyRequest: ElroyRequest,
) {
  console.log("Handling request:", JSON.stringify(elroyRequest, null, 2));

  const {
    to,
    cc = "",
    bcc = "",
    user,
    task,
    quote = DEFAULT_QUOTE,
  } = elroyRequest;

  const reminder = {
    client: user,
    task: task,
  };

  const reminderEmailRequestMessage = await _llmInternals.getSystemMessage(
    TEMPLATE_FOR_REMINDER_EMAIL_REQUEST,
    REMINDER_EMAIL_PREMISE,
    JSON.stringify(reminder),
    JSON.stringify(quote),
  );

  const runtimeExpectedStrings = {
    oneTime: [
      task.name.split(": ")[1],
      quote.content,
      quote.link,
    ],
    unlimited: [
      user,
    ],
  };

  const reminderEmail = await getReminderEmailToSend(
    modelsContext.chat,
    reminderEmailRequestMessage,
    runtimeExpectedStrings,
  );

  const reminderEmailOptions = {
    to: to,
    cc: cc,
    bcc: bcc,
    subject: "A friendly reminder from eras 🌅",
    html: reminderEmail,
  };

  await sendEmail(reminderEmailOptions);
}

async function sendEmail(options: ResendEmailOptions) {
  console.log("Sending email to Resend...");
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
    },
    body: JSON.stringify({ from: "info@eras.fyi", ...options }),
  });

  const data = await resendResponse.json();
  console.log("Response from Resend:", JSON.stringify(data, null, 2));
}

async function getReminderEmailToSend(
  chatModel: ChatOpenAI,
  reminderEmailRequestMessage: SystemChatMessage,
  runtimeExpectedStrings: RuntimeExpectedStrings,
  attempt = 1,
): Promise<string> {
  try {
    console.log(`Attempt ${attempt} to get a valid reminder email...`);
    console.log(
      "Calling OpenAI to get the reminder email",
      reminderEmailRequestMessage,
    );

    const reminderEmailRequestResponse = await _llmInternals.getChatCompletion(
      chatModel,
      [reminderEmailRequestMessage],
    );
    const reminderEmail = reminderEmailRequestResponse.text;
    console.log(
      "Response from OpenAI to reminder email request: ",
      reminderEmail,
    );

    if (!validateReminderEmail(reminderEmail, runtimeExpectedStrings)) {
      // TODO: determine whether to automatically retry when the reminder email is invalid
      throw new Error("Invalid reminder email");
    }

    return cleanReminderEmail(reminderEmail);
  } catch (error) {
    const validationErrorMessage =
      `Error occurred in attempt ${attempt}: ${error.message}`;
    console.error(validationErrorMessage);
    if (attempt < 3) {
      console.log("Retrying...");

      return await getReminderEmailToSend(
        chatModel,
        reminderEmailRequestMessage,
        runtimeExpectedStrings,
        attempt + 1,
      );
    } else {
      // Send notification email to info@eras.fyi
      const error = new Error(
        `Max retries reached. Failed to get a valid reminder email. ${validationErrorMessage}`,
      );
      const options = {
        to: "info@eras.fyi",
        subject: "Error - Elroy: Failed to get a valid reminder email",
        html: `<p>${error.message}</p>`,
      };

      await sendEmail(options);
      throw error;
    }
  }
}

function validateReminderEmail(
  reminderEmail: string,
  runtimeExpectedStrings: RuntimeExpectedStrings,
): boolean {
  console.log("Validating the reminder email...");
  const lowercaseReminderEmail = reminderEmail.toLowerCase();

  console.log("Getting unlimited strings...");
  console.log(
    `Expected unlimited strings: ${
      JSON.stringify(runtimeExpectedStrings, null, 2)
    }`,
  );
  const unlimitedStrings = runtimeExpectedStrings.unlimited.map((s) =>
    s.toLowerCase()
  );
  const buttonStyleStrings = [
    "border-radius: 4px",
    "background-color: #77b5fb",
    "display: inline-block",
    "padding: 10px 20px",
  ];

  console.log("Getting one-time strings...");

  const oneTimeStrings = [
    "<html>",
    "</html>",
    STRIPE_PAYMENT_LINK,
    ...runtimeExpectedStrings.oneTime,
    ...buttonStyleStrings,
  ].map((s) => s.toLowerCase());

  console.log("Confirming that all expected strings are present...");

  const allOneTimeStringsPresent: boolean = oneTimeStrings.every((
    s,
  ) => isExpectedStringPresentOnlyOnce(lowercaseReminderEmail, s));
  console.log(
    "All expected one-time strings are present: ",
    allOneTimeStringsPresent,
  );

  if (!allOneTimeStringsPresent) return allOneTimeStringsPresent;

  const allUnlimitedStringsPresent: boolean = unlimitedStrings.every((
    s,
  ) => lowercaseReminderEmail.includes(s));
  console.log(
    "All expected unlimited strings are present: ",
    allUnlimitedStringsPresent,
  );

  if (!allUnlimitedStringsPresent) return allUnlimitedStringsPresent;

  console.log("Confirming that no bad strings are present...");

  const reminderEmailWithoutExpectedStrings = removeStringsFromReminderEmail(
    lowercaseReminderEmail,
    oneTimeStrings,
  );
  const badStrings = [
    "https://",
    "http://",
    "mailto:",
  ];
  const noBadStringsFound = badStrings.every((badString) => {
    const isNotFound = !reminderEmailWithoutExpectedStrings.includes(badString);
    console.log(`"${badString}" is not found: ${isNotFound}`);

    return isNotFound;
  });

  console.log("No bad strings found: ", noBadStringsFound);

  if (!noBadStringsFound) return noBadStringsFound;

  return true;
}

function isExpectedStringPresentOnlyOnce(
  reminderEmail: string,
  expectedString: string,
): boolean {
  const regex = new RegExp(expectedString, "g");
  const matches = reminderEmail.match(regex);

  const isPresentOnlyOnce = (!matches || matches.length != 1) ? false : true;

  console.log(`"${expectedString}" is present only once: ${isPresentOnlyOnce}`);

  return isPresentOnlyOnce;
}

function removeStringsFromReminderEmail(
  reminderEmail: string,
  links: string[],
): string {
  for (const link of links) {
    // Using a global regular expression to replace all instances of the substring
    const regex = new RegExp(link, "g");
    reminderEmail = reminderEmail.replace(regex, "");
  }
  return reminderEmail;
}

function cleanReminderEmail(reminderEmail: string): string {
  console.log("Cleaning up the reminder email...");
  const withoutTripleQuotes = reminderEmail.replace(new RegExp(`"""`, "g"), "");
  const withoutTripleBackticks = withoutTripleQuotes.replace(
    new RegExp("```", "g"),
    "",
  );

  return withoutTripleBackticks;
}

// _internals are used for testing
export const _internals = {
  handleRequest,
};
