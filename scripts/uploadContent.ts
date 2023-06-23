const dotenv = require("dotenv"); // eslint-disable-line
dotenv.config();

// Copied over to simplify scripts
interface CardItemData {
  link: string;
  imgSrc: string;
  title: string;
  text: string;
  categories: string[];
  length: number;
  points: number;
  questionItems: Question[];
  testedContent: string;
}

interface Question {
  question: string;
  correctAnswer: string;
  incorrectAnswers?: string[];
}

interface ConnorRequest {
  url: string;
  userId: string;
  rawContent?: string;
  shareable?: boolean;
  title?: string;
}

async function sendRequests(
  requests: ConnorRequest[],
  token: string,
): Promise<void> {
  const headers = {
    "authorization": `Bearer ${token}`,
    "content-type": "application/json",
  };
  // TODO: fix this as it doesn't seem to load from env
  const url = (process.env.SUPABASE_FUNCTIONS_URL ?? "") + "/connor";

  for (const request of requests) {
    const response = await fetch(
      url,
      {
        method: "POST",
        headers: headers,
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      console.error(`Error sending request: ${response.statusText}`);
    }
  }
}

async function processJsonFileAndSendRequests(
  userId: string,
  token: string,
): Promise<void> {
  const requests: ConnorRequest[] = cardItemData.map((item: CardItemData) => ({
    url: item.link,
    userId: userId,
    rawContent: item.text,
    title: item.title,
    shareable: true,
  }));

  await sendRequests(requests, token);
}

// Check that we have the right number of command line arguments.
if (process.argv.length < 4) {
  console.error("Usage: node ./scripts/upload_content.ts <userId> <token>");
  process.exit(1);
}

const userId = process.argv[2];

const token = process.argv[3];

processJsonFileAndSendRequests(userId, token).catch(
  console.error,
);
