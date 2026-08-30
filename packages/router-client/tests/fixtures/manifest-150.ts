import type { ReplyOf } from "@taserjs/router/reply";
import type { Client } from "../../src/types.js";

export type Manifest150 = {
  layouts: { "/$": { middlewares: readonly [] } };
  routes: {
    "/r001": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r001";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 1; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r001";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 1 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r002": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r002";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 2; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r002";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 2 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r003": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r003";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 3; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r003";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 3 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r004": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r004";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 4; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r004";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 4 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r005": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r005";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 5; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r005";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 5 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r006": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r006";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 6; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r006";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 6 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r007": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r007";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 7; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r007";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 7 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r008": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r008";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 8; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r008";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 8 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r009": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r009";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 9; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r009";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 9 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r010": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r010";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 10; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r010";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 10 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r011": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r011";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 11; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r011";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 11 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r012": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r012";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 12; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r012";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 12 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r013": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r013";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 13; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r013";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 13 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r014": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r014";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 14; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r014";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 14 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r015": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r015";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 15; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r015";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 15 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r016": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r016";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 16; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r016";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 16 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r017": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r017";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 17; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r017";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 17 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r018": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r018";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 18; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r018";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 18 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r019": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r019";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 19; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r019";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 19 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r020": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r020";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 20; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r020";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 20 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r021": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r021";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 21; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r021";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 21 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r022": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r022";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 22; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r022";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 22 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r023": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r023";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 23; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r023";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 23 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r024": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r024";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 24; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r024";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 24 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r025": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r025";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 25; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r025";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 25 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r026": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r026";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 26; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r026";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 26 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r027": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r027";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 27; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r027";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 27 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r028": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r028";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 28; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r028";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 28 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r029": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r029";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 29; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r029";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 29 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r030": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r030";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 30; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r030";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 30 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r031": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r031";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 31; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r031";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 31 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r032": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r032";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 32; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r032";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 32 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r033": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r033";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 33; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r033";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 33 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r034": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r034";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 34; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r034";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 34 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r035": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r035";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 35; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r035";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 35 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r036": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r036";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 36; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r036";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 36 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r037": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r037";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 37; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r037";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 37 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r038": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r038";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 38; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r038";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 38 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r039": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r039";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 39; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r039";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 39 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r040": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r040";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 40; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r040";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 40 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r041": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r041";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 41; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r041";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 41 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r042": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r042";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 42; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r042";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 42 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r043": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r043";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 43; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r043";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 43 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r044": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r044";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 44; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r044";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 44 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r045": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r045";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 45; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r045";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 45 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r046": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r046";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 46; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r046";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 46 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r047": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r047";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 47; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r047";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 47 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r048": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r048";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 48; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r048";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 48 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r049": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r049";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 49; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r049";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 49 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r050": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r050";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 50; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r050";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 50 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r051": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r051";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 51; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r051";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 51 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r052": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r052";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 52; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r052";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 52 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r053": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r053";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 53; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r053";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 53 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r054": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r054";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 54; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r054";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 54 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r055": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r055";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 55; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r055";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 55 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r056": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r056";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 56; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r056";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 56 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r057": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r057";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 57; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r057";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 57 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r058": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r058";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 58; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r058";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 58 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r059": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r059";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 59; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r059";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 59 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r060": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r060";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 60; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r060";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 60 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r061": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r061";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 61; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r061";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 61 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r062": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r062";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 62; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r062";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 62 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r063": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r063";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 63; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r063";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 63 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r064": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r064";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 64; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r064";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 64 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r065": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r065";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 65; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r065";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 65 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r066": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r066";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 66; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r066";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 66 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r067": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r067";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 67; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r067";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 67 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r068": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r068";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 68; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r068";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 68 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r069": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r069";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 69; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r069";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 69 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r070": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r070";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 70; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r070";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 70 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r071": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r071";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 71; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r071";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 71 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r072": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r072";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 72; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r072";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 72 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r073": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r073";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 73; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r073";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 73 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r074": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r074";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 74; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r074";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 74 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r075": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r075";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 75; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r075";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 75 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r076": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r076";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 76; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r076";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 76 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r077": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r077";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 77; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r077";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 77 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r078": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r078";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 78; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r078";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 78 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r079": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r079";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 79; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r079";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 79 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r080": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r080";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 80; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r080";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 80 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r081": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r081";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 81; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r081";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 81 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r082": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r082";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 82; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r082";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 82 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r083": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r083";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 83; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r083";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 83 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r084": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r084";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 84; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r084";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 84 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r085": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r085";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 85; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r085";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 85 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r086": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r086";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 86; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r086";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 86 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r087": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r087";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 87; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r087";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 87 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r088": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r088";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 88; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r088";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 88 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r089": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r089";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 89; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r089";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 89 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r090": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r090";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 90; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r090";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 90 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r091": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r091";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 91; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r091";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 91 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r092": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r092";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 92; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r092";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 92 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r093": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r093";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 93; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r093";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 93 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r094": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r094";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 94; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r094";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 94 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r095": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r095";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 95; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r095";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 95 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r096": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r096";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 96; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r096";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 96 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r097": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r097";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 97; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r097";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 97 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r098": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r098";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 98; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r098";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 98 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r099": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r099";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 99; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r099";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 99 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r100": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r100";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 100; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r100";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 100 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r101": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r101";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 101; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r101";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 101 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r102": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r102";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 102; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r102";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 102 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r103": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r103";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 103; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r103";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 103 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r104": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r104";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 104; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r104";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 104 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r105": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r105";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 105; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r105";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 105 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r106": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r106";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 106; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r106";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 106 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r107": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r107";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 107; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r107";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 107 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r108": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r108";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 108; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r108";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 108 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r109": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r109";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 109; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r109";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 109 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r110": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r110";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 110; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r110";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 110 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r111": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r111";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 111; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r111";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 111 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r112": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r112";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 112; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r112";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 112 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r113": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r113";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 113; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r113";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 113 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r114": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r114";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 114; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r114";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 114 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r115": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r115";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 115; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r115";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 115 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r116": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r116";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 116; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r116";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 116 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r117": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r117";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 117; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r117";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 117 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r118": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r118";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 118; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r118";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 118 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r119": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r119";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 119; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r119";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 119 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r120": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r120";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 120; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r120";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 120 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r121": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r121";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 121; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r121";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 121 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r122": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r122";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 122; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r122";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 122 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r123": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r123";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 123; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r123";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 123 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r124": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r124";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 124; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r124";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 124 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r125": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r125";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 125; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r125";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 125 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r126": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r126";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 126; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r126";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 126 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r127": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r127";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 127; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r127";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 127 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r128": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r128";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 128; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r128";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 128 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r129": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r129";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 129; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r129";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 129 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r130": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r130";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 130; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r130";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 130 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r131": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r131";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 131; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r131";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 131 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r132": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r132";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 132; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r132";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 132 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r133": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r133";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 133; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r133";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 133 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r134": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r134";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 134; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r134";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 134 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r135": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r135";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 135; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r135";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 135 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r136": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r136";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 136; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r136";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 136 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r137": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r137";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 137; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r137";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 137 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r138": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r138";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 138; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r138";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 138 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r139": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r139";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 139; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r139";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 139 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r140": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r140";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 140; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r140";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 140 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r141": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r141";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 141; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r141";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 141 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r142": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r142";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 142; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r142";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 142 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r143": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r143";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 143; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r143";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 143 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r144": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r144";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 144; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r144";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 144 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r145": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r145";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 145; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r145";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 145 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r146": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r146";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 146; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r146";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 146 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r147": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r147";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 147; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r147";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 147 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r148": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r148";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 148; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r148";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 148 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r149": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r149";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 149; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r149";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 149 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/r150": {
      GET: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r150";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { query: { q: string; page?: number } };
            Output: ReplyOf<200, { id: 150; name: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
      POST: {
        layoutChain: readonly ["/$"];
        route: {
          path: "/r150";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: { body: { title: string; count: number } };
            Output: ReplyOf<201, { created: true; id: 150 }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
  };
};

export type Chain150 = {
  r001: {
    $get: {
      route: {
        path: "/r001";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 1; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r001";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 1 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r002: {
    $get: {
      route: {
        path: "/r002";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 2; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r002";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 2 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r003: {
    $get: {
      route: {
        path: "/r003";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 3; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r003";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 3 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r004: {
    $get: {
      route: {
        path: "/r004";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 4; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r004";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 4 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r005: {
    $get: {
      route: {
        path: "/r005";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 5; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r005";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 5 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r006: {
    $get: {
      route: {
        path: "/r006";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 6; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r006";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 6 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r007: {
    $get: {
      route: {
        path: "/r007";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 7; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r007";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 7 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r008: {
    $get: {
      route: {
        path: "/r008";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 8; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r008";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 8 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r009: {
    $get: {
      route: {
        path: "/r009";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 9; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r009";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 9 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r010: {
    $get: {
      route: {
        path: "/r010";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 10; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r010";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 10 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r011: {
    $get: {
      route: {
        path: "/r011";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 11; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r011";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 11 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r012: {
    $get: {
      route: {
        path: "/r012";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 12; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r012";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 12 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r013: {
    $get: {
      route: {
        path: "/r013";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 13; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r013";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 13 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r014: {
    $get: {
      route: {
        path: "/r014";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 14; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r014";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 14 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r015: {
    $get: {
      route: {
        path: "/r015";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 15; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r015";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 15 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r016: {
    $get: {
      route: {
        path: "/r016";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 16; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r016";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 16 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r017: {
    $get: {
      route: {
        path: "/r017";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 17; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r017";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 17 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r018: {
    $get: {
      route: {
        path: "/r018";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 18; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r018";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 18 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r019: {
    $get: {
      route: {
        path: "/r019";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 19; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r019";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 19 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r020: {
    $get: {
      route: {
        path: "/r020";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 20; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r020";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 20 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r021: {
    $get: {
      route: {
        path: "/r021";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 21; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r021";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 21 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r022: {
    $get: {
      route: {
        path: "/r022";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 22; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r022";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 22 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r023: {
    $get: {
      route: {
        path: "/r023";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 23; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r023";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 23 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r024: {
    $get: {
      route: {
        path: "/r024";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 24; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r024";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 24 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r025: {
    $get: {
      route: {
        path: "/r025";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 25; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r025";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 25 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r026: {
    $get: {
      route: {
        path: "/r026";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 26; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r026";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 26 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r027: {
    $get: {
      route: {
        path: "/r027";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 27; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r027";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 27 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r028: {
    $get: {
      route: {
        path: "/r028";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 28; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r028";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 28 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r029: {
    $get: {
      route: {
        path: "/r029";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 29; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r029";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 29 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r030: {
    $get: {
      route: {
        path: "/r030";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 30; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r030";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 30 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r031: {
    $get: {
      route: {
        path: "/r031";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 31; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r031";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 31 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r032: {
    $get: {
      route: {
        path: "/r032";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 32; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r032";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 32 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r033: {
    $get: {
      route: {
        path: "/r033";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 33; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r033";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 33 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r034: {
    $get: {
      route: {
        path: "/r034";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 34; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r034";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 34 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r035: {
    $get: {
      route: {
        path: "/r035";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 35; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r035";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 35 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r036: {
    $get: {
      route: {
        path: "/r036";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 36; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r036";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 36 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r037: {
    $get: {
      route: {
        path: "/r037";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 37; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r037";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 37 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r038: {
    $get: {
      route: {
        path: "/r038";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 38; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r038";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 38 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r039: {
    $get: {
      route: {
        path: "/r039";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 39; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r039";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 39 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r040: {
    $get: {
      route: {
        path: "/r040";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 40; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r040";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 40 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r041: {
    $get: {
      route: {
        path: "/r041";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 41; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r041";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 41 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r042: {
    $get: {
      route: {
        path: "/r042";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 42; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r042";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 42 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r043: {
    $get: {
      route: {
        path: "/r043";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 43; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r043";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 43 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r044: {
    $get: {
      route: {
        path: "/r044";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 44; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r044";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 44 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r045: {
    $get: {
      route: {
        path: "/r045";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 45; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r045";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 45 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r046: {
    $get: {
      route: {
        path: "/r046";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 46; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r046";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 46 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r047: {
    $get: {
      route: {
        path: "/r047";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 47; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r047";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 47 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r048: {
    $get: {
      route: {
        path: "/r048";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 48; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r048";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 48 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r049: {
    $get: {
      route: {
        path: "/r049";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 49; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r049";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 49 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r050: {
    $get: {
      route: {
        path: "/r050";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 50; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r050";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 50 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r051: {
    $get: {
      route: {
        path: "/r051";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 51; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r051";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 51 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r052: {
    $get: {
      route: {
        path: "/r052";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 52; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r052";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 52 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r053: {
    $get: {
      route: {
        path: "/r053";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 53; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r053";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 53 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r054: {
    $get: {
      route: {
        path: "/r054";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 54; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r054";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 54 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r055: {
    $get: {
      route: {
        path: "/r055";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 55; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r055";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 55 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r056: {
    $get: {
      route: {
        path: "/r056";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 56; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r056";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 56 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r057: {
    $get: {
      route: {
        path: "/r057";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 57; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r057";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 57 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r058: {
    $get: {
      route: {
        path: "/r058";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 58; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r058";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 58 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r059: {
    $get: {
      route: {
        path: "/r059";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 59; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r059";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 59 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r060: {
    $get: {
      route: {
        path: "/r060";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 60; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r060";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 60 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r061: {
    $get: {
      route: {
        path: "/r061";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 61; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r061";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 61 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r062: {
    $get: {
      route: {
        path: "/r062";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 62; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r062";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 62 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r063: {
    $get: {
      route: {
        path: "/r063";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 63; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r063";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 63 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r064: {
    $get: {
      route: {
        path: "/r064";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 64; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r064";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 64 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r065: {
    $get: {
      route: {
        path: "/r065";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 65; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r065";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 65 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r066: {
    $get: {
      route: {
        path: "/r066";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 66; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r066";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 66 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r067: {
    $get: {
      route: {
        path: "/r067";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 67; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r067";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 67 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r068: {
    $get: {
      route: {
        path: "/r068";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 68; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r068";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 68 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r069: {
    $get: {
      route: {
        path: "/r069";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 69; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r069";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 69 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r070: {
    $get: {
      route: {
        path: "/r070";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 70; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r070";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 70 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r071: {
    $get: {
      route: {
        path: "/r071";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 71; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r071";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 71 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r072: {
    $get: {
      route: {
        path: "/r072";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 72; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r072";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 72 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r073: {
    $get: {
      route: {
        path: "/r073";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 73; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r073";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 73 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r074: {
    $get: {
      route: {
        path: "/r074";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 74; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r074";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 74 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r075: {
    $get: {
      route: {
        path: "/r075";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 75; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r075";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 75 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r076: {
    $get: {
      route: {
        path: "/r076";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 76; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r076";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 76 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r077: {
    $get: {
      route: {
        path: "/r077";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 77; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r077";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 77 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r078: {
    $get: {
      route: {
        path: "/r078";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 78; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r078";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 78 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r079: {
    $get: {
      route: {
        path: "/r079";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 79; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r079";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 79 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r080: {
    $get: {
      route: {
        path: "/r080";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 80; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r080";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 80 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r081: {
    $get: {
      route: {
        path: "/r081";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 81; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r081";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 81 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r082: {
    $get: {
      route: {
        path: "/r082";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 82; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r082";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 82 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r083: {
    $get: {
      route: {
        path: "/r083";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 83; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r083";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 83 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r084: {
    $get: {
      route: {
        path: "/r084";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 84; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r084";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 84 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r085: {
    $get: {
      route: {
        path: "/r085";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 85; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r085";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 85 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r086: {
    $get: {
      route: {
        path: "/r086";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 86; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r086";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 86 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r087: {
    $get: {
      route: {
        path: "/r087";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 87; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r087";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 87 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r088: {
    $get: {
      route: {
        path: "/r088";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 88; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r088";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 88 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r089: {
    $get: {
      route: {
        path: "/r089";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 89; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r089";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 89 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r090: {
    $get: {
      route: {
        path: "/r090";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 90; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r090";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 90 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r091: {
    $get: {
      route: {
        path: "/r091";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 91; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r091";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 91 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r092: {
    $get: {
      route: {
        path: "/r092";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 92; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r092";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 92 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r093: {
    $get: {
      route: {
        path: "/r093";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 93; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r093";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 93 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r094: {
    $get: {
      route: {
        path: "/r094";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 94; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r094";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 94 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r095: {
    $get: {
      route: {
        path: "/r095";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 95; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r095";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 95 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r096: {
    $get: {
      route: {
        path: "/r096";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 96; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r096";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 96 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r097: {
    $get: {
      route: {
        path: "/r097";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 97; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r097";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 97 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r098: {
    $get: {
      route: {
        path: "/r098";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 98; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r098";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 98 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r099: {
    $get: {
      route: {
        path: "/r099";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 99; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r099";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 99 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r100: {
    $get: {
      route: {
        path: "/r100";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 100; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r100";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 100 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r101: {
    $get: {
      route: {
        path: "/r101";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 101; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r101";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 101 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r102: {
    $get: {
      route: {
        path: "/r102";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 102; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r102";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 102 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r103: {
    $get: {
      route: {
        path: "/r103";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 103; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r103";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 103 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r104: {
    $get: {
      route: {
        path: "/r104";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 104; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r104";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 104 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r105: {
    $get: {
      route: {
        path: "/r105";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 105; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r105";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 105 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r106: {
    $get: {
      route: {
        path: "/r106";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 106; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r106";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 106 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r107: {
    $get: {
      route: {
        path: "/r107";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 107; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r107";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 107 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r108: {
    $get: {
      route: {
        path: "/r108";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 108; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r108";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 108 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r109: {
    $get: {
      route: {
        path: "/r109";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 109; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r109";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 109 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r110: {
    $get: {
      route: {
        path: "/r110";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 110; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r110";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 110 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r111: {
    $get: {
      route: {
        path: "/r111";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 111; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r111";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 111 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r112: {
    $get: {
      route: {
        path: "/r112";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 112; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r112";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 112 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r113: {
    $get: {
      route: {
        path: "/r113";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 113; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r113";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 113 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r114: {
    $get: {
      route: {
        path: "/r114";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 114; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r114";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 114 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r115: {
    $get: {
      route: {
        path: "/r115";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 115; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r115";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 115 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r116: {
    $get: {
      route: {
        path: "/r116";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 116; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r116";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 116 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r117: {
    $get: {
      route: {
        path: "/r117";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 117; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r117";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 117 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r118: {
    $get: {
      route: {
        path: "/r118";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 118; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r118";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 118 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r119: {
    $get: {
      route: {
        path: "/r119";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 119; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r119";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 119 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r120: {
    $get: {
      route: {
        path: "/r120";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 120; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r120";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 120 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r121: {
    $get: {
      route: {
        path: "/r121";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 121; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r121";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 121 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r122: {
    $get: {
      route: {
        path: "/r122";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 122; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r122";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 122 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r123: {
    $get: {
      route: {
        path: "/r123";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 123; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r123";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 123 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r124: {
    $get: {
      route: {
        path: "/r124";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 124; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r124";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 124 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r125: {
    $get: {
      route: {
        path: "/r125";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 125; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r125";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 125 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r126: {
    $get: {
      route: {
        path: "/r126";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 126; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r126";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 126 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r127: {
    $get: {
      route: {
        path: "/r127";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 127; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r127";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 127 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r128: {
    $get: {
      route: {
        path: "/r128";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 128; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r128";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 128 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r129: {
    $get: {
      route: {
        path: "/r129";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 129; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r129";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 129 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r130: {
    $get: {
      route: {
        path: "/r130";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 130; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r130";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 130 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r131: {
    $get: {
      route: {
        path: "/r131";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 131; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r131";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 131 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r132: {
    $get: {
      route: {
        path: "/r132";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 132; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r132";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 132 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r133: {
    $get: {
      route: {
        path: "/r133";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 133; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r133";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 133 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r134: {
    $get: {
      route: {
        path: "/r134";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 134; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r134";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 134 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r135: {
    $get: {
      route: {
        path: "/r135";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 135; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r135";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 135 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r136: {
    $get: {
      route: {
        path: "/r136";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 136; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r136";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 136 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r137: {
    $get: {
      route: {
        path: "/r137";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 137; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r137";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 137 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r138: {
    $get: {
      route: {
        path: "/r138";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 138; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r138";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 138 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r139: {
    $get: {
      route: {
        path: "/r139";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 139; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r139";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 139 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r140: {
    $get: {
      route: {
        path: "/r140";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 140; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r140";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 140 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r141: {
    $get: {
      route: {
        path: "/r141";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 141; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r141";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 141 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r142: {
    $get: {
      route: {
        path: "/r142";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 142; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r142";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 142 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r143: {
    $get: {
      route: {
        path: "/r143";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 143; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r143";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 143 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r144: {
    $get: {
      route: {
        path: "/r144";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 144; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r144";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 144 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r145: {
    $get: {
      route: {
        path: "/r145";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 145; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r145";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 145 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r146: {
    $get: {
      route: {
        path: "/r146";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 146; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r146";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 146 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r147: {
    $get: {
      route: {
        path: "/r147";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 147; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r147";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 147 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r148: {
    $get: {
      route: {
        path: "/r148";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 148; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r148";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 148 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r149: {
    $get: {
      route: {
        path: "/r149";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 149; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r149";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 149 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
  r150: {
    $get: {
      route: {
        path: "/r150";
        method: "GET";
        middlewares: readonly [];
        $Infer: {
          Input: { query: { q: string; page?: number } };
          Output: ReplyOf<200, { id: 150; name: string }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
    $post: {
      route: {
        path: "/r150";
        method: "POST";
        middlewares: readonly [];
        $Infer: {
          Input: { body: { title: string; count: number } };
          Output: ReplyOf<201, { created: true; id: 150 }>;
        };
        handler: (ctx: unknown) => unknown;
      };
    };
  };
};

export type Client150 = Client<Manifest150>;
