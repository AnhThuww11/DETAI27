import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

const ok200 = new Counter("responses_200_v1");
const err500 = new Counter("responses_500_v2");

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1";
const HOST = __ENV.HOST || "canary.local";

export const options = {
    vus: 10,
    duration: __ENV.DURATION || "8m",
};

export default function () {
    const res = http.get(`${BASE_URL}/`, { headers: { Host: HOST } });

    check(res, { "status is 200": (r) => r.status === 200 });

    if (res.status === 200) ok200.add(1);
    else if (res.status === 500) err500.add(1);

    sleep(0.1);
}
