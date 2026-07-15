<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>{{ $heading }}</title>
    <style>
    @media only screen and (max-width: 520px) {
        .email-shell {
            padding: 16px !important;
        }

        .email-card {
            width: 100% !important;
        }

        .email-content {
            padding: 28px 24px !important;
        }
    }
    </style>
</head>

<body style="background-color: #143c62; margin: 0; padding: 0; width: 100%;">
    <div
        style="display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
        {{ $preheader }}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#143c62"
        style="background-color: #143c62; width: 100%;">
        <tr>
            <td class="email-shell" align="center" style="padding: 40px 16px;">
                <table class="email-card" role="presentation" width="448" cellpadding="0" cellspacing="0" border="0"
                    bgcolor="#ffffff"
                    style="background-color: #ffffff; border: 1px solid #d9dfe5; border-radius: 8px; box-shadow: 0 4px 14px rgba(15, 23, 31, 0.14); max-width: 448px; overflow: hidden; width: 100%;">
                    <tr>
                        <td class="email-content"
                            style="font-family: Poppins, Arial, Helvetica, sans-serif; padding: 32px 48px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                                style="margin: 0 auto 20px;">
                                <tr>

                                    <td
                                        style="color: #143c62; font-size: 20px; font-weight: 700; line-height: 1.3; vertical-align: middle; white-space: nowrap;">
                                        TOL Barbershop
                                    </td>
                                </tr>
                            </table>

                            <h1
                                style="color: #0f171f; font-size: 24px; font-weight: 600; line-height: 1.3; margin: 0 0 20px; text-align: center;">
                                {{ $heading }}</h1>

                            <p style="color: #0f171f; font-size: 15px; line-height: 1.6; margin: 0 0 12px;">Hi
                                {{ $customerName }},</p>
                            <p style="color: #5b646f; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">{{ $intro }}
                            </p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                                style="margin: 0 0 24px; width: 100%;">
                                <tr>
                                    <td align="center" bgcolor="#de3b3d"
                                        style="background-color: #de3b3d; border-radius: 6px;">
                                        <a href="{{ $actionUrl }}" target="_blank" rel="noopener noreferrer"
                                            style="color: #ffffff; display: block; font-family: Poppins, Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; line-height: 20px; padding: 13px 20px; text-align: center; text-decoration: none;">{{ $actionText }}</a>
                                    </td>
                                </tr>
                            </table>

                            <p
                                style="color: #5b646f; font-size: 13px; line-height: 1.6; margin: 0 0 8px; text-align: center;">
                                For your security, this link expires in {{ $expiresIn }} minutes.</p>
                            <p
                                style="color: #5b646f; font-size: 13px; line-height: 1.6; margin: 0; text-align: center;">
                                {{ $securityMessage }}</p>

                            <div style="border-top: 1px solid #d9dfe5; margin-top: 28px; padding-top: 20px;">
                                <p style="color: #5b646f; font-size: 12px; line-height: 1.6; margin: 0 0 8px;">Button
                                    not working? Copy and paste this link into your browser:</p>
                                <p
                                    style="font-size: 12px; line-height: 1.6; margin: 0; overflow-wrap: anywhere; word-break: break-all;">
                                    <a href="{{ $actionUrl }}"
                                        style="color: #de3b3d; text-decoration: underline;">{{ $actionUrl }}</a>
                                </p>
                            </div>

                            <div
                                style="border-top: 1px solid #d9dfe5; margin-top: 24px; padding-top: 18px; text-align: center;">
                                <p style="color: #7a838d; font-size: 11px; line-height: 1.6; margin: 0 0 6px;">
                                    <a href="{{ rtrim((string) config('app.frontend_url'), '/') }}/privacy-policy"
                                        style="color: #7a838d; text-decoration: underline;">Privacy</a>
                                    &nbsp;&middot;&nbsp;
                                    <a href="{{ rtrim((string) config('app.frontend_url'), '/') }}/terms-of-use"
                                        style="color: #7a838d; text-decoration: underline;">Terms</a>
                                    &nbsp;&middot;&nbsp;
                                    <a href="{{ rtrim((string) config('app.frontend_url'), '/') }}/data-compliance"
                                        style="color: #7a838d; text-decoration: underline;">Data Compliance</a>
                                </p>
                                <p style="color: #7a838d; font-size: 11px; line-height: 1.6; margin: 0;">&copy;
                                    {{ date('Y') }} TOL Barbershop. All rights reserved.</p>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>