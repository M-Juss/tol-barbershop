<?php

use App\Support\PushEndpointValidator;

test('known browser push providers are accepted', function (string $endpoint) {
    expect(PushEndpointValidator::validate($endpoint))->toBeTrue();
})->with([
    'google' => 'https://fcm.googleapis.com/fcm/send/example',
    'mozilla' => 'https://updates.push.services.mozilla.com/wpush/v2/example',
    'apple' => 'https://web.push.apple.com/Q/example',
    'windows' => 'https://wns2-bl2p.notify.windows.com/w/?token=example',
]);

test('untrusted or malformed push endpoints are rejected', function (string $endpoint) {
    expect(PushEndpointValidator::validate($endpoint))->toBeFalse();
})->with([
    'attacker domain' => 'https://attacker.example/push',
    'suffix confusion' => 'https://fcm.googleapis.com.attacker.example/push',
    'private ip' => 'https://127.0.0.1/push',
    'ipv6 loopback' => 'https://[::1]/push',
    'userinfo' => 'https://fcm.googleapis.com@attacker.example/push',
    'nonstandard port' => 'https://fcm.googleapis.com:8443/push',
    'insecure scheme' => 'http://fcm.googleapis.com/push',
]);
