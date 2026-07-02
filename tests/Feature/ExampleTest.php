<?php

test('returns a successful response', function () {
    $response = $this->getJson('/api/v1/public/test');

    $response->assertOk();
});
