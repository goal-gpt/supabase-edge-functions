import { assertSpyCalls, returnsNext, stub } from "testing/mock.ts";
import {
  _internals as _privilegedRequestHandlerInternals,
  premise,
} from "./privilegedRequestHandler.ts";
import { _internals as _supabaseClientInternals } from "../_shared/supabase-client.ts";
import { _internals as _llmInternals } from "../_shared/llm.ts";
import { SeraRequest } from "./sera.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { ChatOpenAI } from "langchain/chat_models/openai";
import * as sinon from "sinon";
import { assertEquals, assertStrictEquals } from "testing/asserts.ts";
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

      const response = await _privilegedRequestHandlerInternals.handleRequest(
        modelStubWithCall,
        supabaseClientStub,
        seraRequest,
      );

      assertSpyCalls(createChatStub, 1);
      assertSpyCalls(createChatLineStub, 2);
      assertStrictEquals(response.text, modelResponseJson.text);
      assertStrictEquals(
        JSON.stringify(response.plan),
        JSON.stringify(modelResponseJson.plan),
      );
      assertStrictEquals(response.question, modelResponseJson.question);
      assertEquals(response.chat, chat);

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
});
