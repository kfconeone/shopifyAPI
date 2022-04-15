import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async (request: VercelRequest, response: VercelResponse) => {
  console.log("body:", request.body);
  response.status(200).send(request.body);
};
