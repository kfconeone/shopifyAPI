import type { VercelRequest, VercelResponse } from "@vercel/node";

const serviceAccount = {
  type: process.env.type,
  project_id: process.env.project_id,
  private_key_id: process.env.private_key_id,
  private_key: process.env.private_key,
  client_email: process.env.client_email,
  client_id: process.env.client_id,
  auth_uri: process.env.auth_uri,
  token_uri: process.env.token_uri,
  auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
  client_x509_cert_url: process.env.client_x509_cert_url,
};

export default (request: VercelRequest, response: VercelResponse) => {
  console.log("body--:", request.body);
  // console.log("body--:", JSON.parse(request.body));

  // product.variants.forEach((variant: any) => {
  //   console.log(variant.price);
  //   console.log(variant.sku);
  //   console.log(variant.id);
  //   console.log(product.handle);
  // });

  response.status(200).send("Hello World!");
};
