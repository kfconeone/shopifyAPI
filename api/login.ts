import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async (request: VercelRequest, response: VercelResponse) => {
  console.log("現在時間:", new Date());
  response.status(200).send("現在時間:" + new Date().toString());
};
