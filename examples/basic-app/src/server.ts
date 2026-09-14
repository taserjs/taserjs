export default {
  fetch(request: Request) {
    if (request.url.includes("/host")) {
      return new Response("Hello, world!");
    }
  },
};
