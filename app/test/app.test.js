const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const BASE_URL = 'http://localhost:3000';

let server;

async function startServer(failMode) {
    server = spawn('node', ['src/app.js'], {
        env: {
            ...process.env,
            FAIL: failMode ? 'true' : 'false'
        },
        stdio: 'ignore'
    });

    // Đợi server khởi động
    for (let i = 0; i < 50; i++) {
        try {
            await fetch(`${BASE_URL}/health`);
            return;
        } catch {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    throw new Error('Server không thể khởi động');
}

async function stopServer() {
    if (server && server.exitCode === null) {
        server.kill();
        await new Promise(resolve => server.once('exit', resolve));
    }
}

test('V1 - Healthy version', async (t) => {
    await startServer(false);

    const home = await fetch(BASE_URL);
    assert.equal(home.status, 200);

    const health = await fetch(`${BASE_URL}/health`);
    assert.equal(health.status, 200);

    const metrics = await fetch(`${BASE_URL}/metrics`);
    assert.equal(metrics.status, 200);

    await t.test('V1 homepage returns HTTP 200', () => {
        assert.equal(home.status, 200);
    });

    await t.test('V1 health returns HTTP 200', () => {
        assert.equal(health.status, 200);
    });

    await t.test('V1 metrics endpoint works', () => {
        assert.equal(metrics.status, 200);
    });

    await stopServer();
});

test('V2 - Unhealthy version', async (t) => {
    await startServer(true);

    const home = await fetch(BASE_URL);
    assert.equal(home.status, 500);

    const health = await fetch(`${BASE_URL}/health`);
    assert.equal(health.status, 500);

    const metrics = await fetch(`${BASE_URL}/metrics`);
    assert.equal(metrics.status, 200);

    await t.test('V2 homepage returns HTTP 500', () => {
        assert.equal(home.status, 500);
    });

    await t.test('V2 health returns HTTP 500', () => {
        assert.equal(health.status, 500);
    });

    await t.test('V2 metrics endpoint still works', () => {
        assert.equal(metrics.status, 200);
    });

    await stopServer();
});