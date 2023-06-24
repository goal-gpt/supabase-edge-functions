import { assertSpyCalls, returnsNext, stub } from "testing/mock.ts";
import {
  _internals as _privilegedRequestHandlerInternals,
  premise,
} from "./privilegedRequestHandler.ts";
import { _internals as _supabaseClientInternals } from "../_shared/supabaseClient.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";
import { SeraRequest } from "./sera.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { ChatOpenAI } from "langchain/chat_models/openai";
import * as sinon from "sinon";
import { assert, assertEquals, assertStrictEquals } from "testing/asserts.ts";
import {
  AIChatMessage,
  BaseChatMessage,
  SystemChatMessage,
} from "langchain/schema";

// TODO: Determine how to make tests DRY-er
Deno.test("handleRequest", async (t) => {
  const supabaseClientStub = sinon.createStubInstance(SupabaseClient);
  const chat = 1;
  const modelResponsePreamble =
    "I suggest starting by creating a budget to determine how much money you can allocate towards job searching. " +
    "Then, research companies and job openings that match your skills and interests. You can use job search websites " +
    "like Indeed or LinkedIn to find job postings. Additionally, consider reaching out to your network and attending " +
    "job fairs to expand your opportunities. Once you have identified potential job openings, tailor your resume and " +
    "cover letter to each position to increase your chances of getting hired. Finally, prepare for interviews by " +
    "researching the company and practicing common interview questions. Good luck with your job search! ";
  const modelResponseJsonString = "\n\n{\n    " +
    '"text": "I suggest starting by creating a budget to determine how much money you can allocate towards job searching. ' +
    "Then, research companies and job openings that match your skills and interests. You can use job search websites like " +
    "Indeed or LinkedIn to find job postings. Additionally, consider reaching out to your network and attending job fairs " +
    "to expand your opportunities. Once you have identified potential job openings, tailor your resume and cover letter " +
    "to each position to increase your chances of getting hired. Finally, prepare for interviews by researching the company " +
    'and practicing common interview questions. Good luck with your job search!",\n    "question": "Do you think this plan ' +
    'will help you find a job that matches your skills and interests? Are you able to follow these steps?",\n    "plan": ' +
    '{\n        "goal": "Find job openings that match your skills and interests and prepare for interviews.",\n        ' +
    '"steps": [\n            {\n                "number": 1,\n                "action": "Create a budget to determine how ' +
    'much money you can allocate towards job searching."\n            },\n            {\n                "number": 2,\n                ' +
    '"action": "Research companies and job openings that match your skills and interests using job search websites like ' +
    'Indeed or LinkedIn."\n            },\n            {\n                "number": 3,\n                "action": ' +
    '"Consider reaching out to your network and attending job fairs to expand your opportunities."\n            },\n            ' +
    '{\n                "number": 4,\n                "action": "Tailor your resume and cover letter to each position ' +
    'to increase your chances of getting hired."\n            },\n            {\n                "number": 5,' +
    '\n                "action": "Prepare for interviews by researching the company and practicing common ' +
    'interview questions."\n            }\n        ]\n    }\n}';
  const modelResponseJson = JSON.parse(modelResponseJsonString);
  const modelStubWithCall = sinon.createStubInstance(ChatOpenAI, {
    call: new AIChatMessage(
      `${modelResponsePreamble}${modelResponseJsonString}`,
    ),
  });

  await t.step("without a chat", async (t) => {
    await t.step("creates chat", async () => {
      const seraRequest: SeraRequest = {
        message: "Hello",
      };
      const chat = 1;
      const chatPromise = new Promise<number>((resolve) => {
        resolve(chat);
      });
      const createChatStub = stub(
        _privilegedRequestHandlerInternals,
        "createChat",
        returnsNext([chatPromise]),
      );
      const createChatLineStub = stub(
        _privilegedRequestHandlerInternals,
        "createChatLine",
      );

      const planArtifacts = await _privilegedRequestHandlerInternals.handleRequest(
        modelStubWithCall,
        supabaseClientStub,
        seraRequest,
      );

      assertSpyCalls(createChatStub, 1);
      assertSpyCalls(createChatLineStub, 2);
      assertStrictEquals(planArtifacts.seraResponse.text, modelResponseJson.text);
      assertStrictEquals(
        JSON.stringify(planArtifacts.seraResponse.plan),
        JSON.stringify(modelResponseJson.plan),
      );
      assertEquals(planArtifacts.seraResponse.chat, chat);

      createChatStub.restore();
      createChatLineStub.restore();
    });
  });
  await t.step("with a chat, gets chat lines", async () => {
    stub(_privilegedRequestHandlerInternals, "createChatLine");

    const chatLines: BaseChatMessage[] = [new SystemChatMessage(premise)];
    const chatLinesPromise: Promise<BaseChatMessage[]> = new Promise(
      (resolve) => {
        resolve(chatLines);
      },
    );
    const getAllChatLinesStub = stub(
      _privilegedRequestHandlerInternals,
      "getAllChatLines",
      returnsNext([chatLinesPromise]),
    );

    const seraRequest: SeraRequest = {
      message: "Hello",
      chat: chat,
    };

    await _privilegedRequestHandlerInternals.handleRequest(
      modelStubWithCall,
      supabaseClientStub,
      seraRequest,
    );

    assertSpyCalls(getAllChatLinesStub, 1);
  });
  await t.step("handles poorly formatted responses", async () => {
    const text =
      "Sure, let's plan your dinner! Cooking at home is a great way to save money. Do you have the ingredients to make cheese risotto?";
    const stepDescription =
      "Check your pantry, fridge, and freezer for the ingredients needed to make cheese risotto. You will need Arborio rice, onion, garlic, vegetable broth, white wine, butter, Parmesan cheese, and Gorgonzola cheese.";
    const stepName = "Gather ingredients";
    const goal = "Make cheese risotto for dinner";
    const badResponseStringWithPlan =
      `ai: ai: {text: "${text}", question: "", plan: {goal: "${goal}", steps: [{number: 1, action: {name: "${stepName}", description: "${stepDescription}"}}]}}`;
    const seraRequest: SeraRequest = {
      message: "Hello",
    };
    const chatPromise = new Promise<number>((resolve) => {
      resolve(chat);
    });
    const createChatStub = stub(
      _privilegedRequestHandlerInternals,
      "createChat",
      returnsNext([chatPromise]),
    );
    const modelStubWithCallForBadResponseWithPlan = sinon.createStubInstance(
      ChatOpenAI,
      {
        call: new AIChatMessage(badResponseStringWithPlan),
      },
    );

    const planArtifacts = await _privilegedRequestHandlerInternals.handleRequest(
      modelStubWithCallForBadResponseWithPlan,
      supabaseClientStub,
      seraRequest,
    );

    const expectedResponse = {
      text: text,
      plan: {
        goal: goal,
        steps: [{
          number: 1,
          action: { name: stepName, description: stepDescription },
        }],
      },
      question: "",
      chat: chat,
    };

    assertStrictEquals(planArtifacts.seraResponse.text, expectedResponse.text);
    assertStrictEquals(
      JSON.stringify(planArtifacts.seraResponse.plan),
      JSON.stringify(expectedResponse.plan),
    );
    assertEquals(planArtifacts.seraResponse.chat, chat);

    createChatStub.restore();
  });
  await t.step("handles responses without plan JSON", async () => {
    const text = "Hello! How can I assist you today?";
    const seraRequest: SeraRequest = {
      message: "Hello",
    };
    const chatPromise = new Promise<number>((resolve) => {
      resolve(chat);
    });
    const createChatStub = stub(
      _privilegedRequestHandlerInternals,
      "createChat",
      returnsNext([chatPromise]),
    );
    const modelStubWithCallForResponseWithoutPlan = sinon.createStubInstance(
      ChatOpenAI,
      {
        call: new AIChatMessage(text),
      },
    );

    const planArtifacts = await _privilegedRequestHandlerInternals.handleRequest(
      modelStubWithCallForResponseWithoutPlan,
      supabaseClientStub,
      seraRequest,
    );

    const expectedResponse = {
      text: text,
      chat: chat,
    };

    assertStrictEquals(planArtifacts.seraResponse.text, expectedResponse.text);
    assert(!Object.keys(planArtifacts).includes("plan"));
    assert(!Object.keys(planArtifacts).includes("question"));
    assertEquals(planArtifacts.seraResponse.chat, chat);

    createChatStub.restore();
  });
  await t.step(
    "handles responses when a key word is followed by a colon but is not used as a JSON key",
    async () => {
      const responseWithTrickyKeys =
        `"{\n    \"text\": \"To help you decide between stocks and bonds, here is a plan:\",\n    \"question\": \"Do you think you can follow these steps?\",\n    \"plan\": {\n        \"goal\": \"Choose between stocks and bonds\",\n        \"steps\": [\n            {\n                \"number\": 1,\n                \"action\": {\n                    \"name\": \"Research stocks and bonds\",\n                    \"description\": \"Spend some time researching the differences between stocks and bonds. Look at the historical performance of each and consider the level of risk you are comfortable with.\"\n                }\n            },\n            {\n                \"number\": 2,\n                \"action\": {\n                    \"name\": \"Determine your investment goals\",\n                    \"description\": \"Think about your investment goals and how they align with the potential risks and returns of stocks and bonds. Consider your time horizon, risk tolerance, and financial situation.\"\n                }\n            },\n            {\n                \"number\": 3,\n                \"action\": {\n                    \"name\": \"Consult with a financial advisor\",\n                    \"description\": \"Consider consulting with a financial advisor to get professional advice on which investment option is best for you. They can help you create a personalized investment plan based on your goals and risk tolerance.\"\n                }\n            }\n        ]\n    }\n}"`;
      const seraRequest: SeraRequest = {
        message: "Hello",
      };
      const chatPromise = new Promise<number>((resolve) => {
        resolve(chat);
      });
      const createChatStub = stub(
        _privilegedRequestHandlerInternals,
        "createChat",
        returnsNext([chatPromise]),
      );
      const modelStubWithCallForResponseWithTrickyKeys = sinon
        .createStubInstance(
          ChatOpenAI,
          {
            call: new AIChatMessage(responseWithTrickyKeys),
          },
        );

      const planArtifacts = await _privilegedRequestHandlerInternals.handleRequest(
        modelStubWithCallForResponseWithTrickyKeys,
        supabaseClientStub,
        seraRequest,
      );

      assert(planArtifacts.seraResponse.text);
      assert(planArtifacts.seraResponse.plan);
      assert(planArtifacts.seraResponse.chat);

      createChatStub.restore();
    },
  );
});
