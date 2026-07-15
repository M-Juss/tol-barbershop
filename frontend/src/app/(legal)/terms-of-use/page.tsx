import type { Metadata } from "next";

import { LegalDocument } from "@/app/(legal)/_components/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Use | TOL Barbershop",
  description:
    "Terms governing TOL Barbershop accounts, bookings, support, feedback, and website use.",
};

export default function TermsOfUsePage() {
  return (
    <LegalDocument
      title="Terms of Use"
      summary="These terms govern use of the TOL Barbershop website and its account, booking, support, feedback, and notification features."
    >
      <section>
        <h2>1. Agreement and operator</h2>
        <p>
          By using the service, you accept these Terms of Use. When you create
          an account, you expressly agree to these terms and acknowledge that
          you have read our Privacy Policy. The service is operated by TOL Barbershop at 2nd Floor,
          Osrem Building, Gen. Trias Drive, Tejero, General Trias City, Cavite,
          Philippines. If you do not agree, do not use the service.
        </p>
      </section>

      <section>
        <h2>2. Accounts</h2>
        <p>
          Provide accurate, current account information and keep your login
          credentials confidential. You are responsible for activity under
          your account unless you promptly report unauthorized access. We may
          require email verification and may reject, restrict, or deactivate
          accounts that are false, compromised, abusive, or used contrary to
          these terms or law.
        </p>
      </section>

      <section>
        <h2>3. Appointments and approval</h2>
        <p>
          An online booking is a request, not an immediately confirmed
          appointment. Requests remain pending until authorized staff approve
          them. Availability can change while a request is pending, and we may
          reject or propose changes to a request because of barber or service
          availability, shop closure, scheduling conflicts, safety, or other
          reasonable operational needs. Check the booking status and service
          communications before visiting.
        </p>
        <p>
          Staff may create or update walk-in and shop bookings. Authorized
          staff can access booking details as needed to review requests,
          schedule barbers, provide services, document status and reasons,
          support customers, and prepare operational reports.
        </p>
      </section>

      <section>
        <h2>4. Group bookings</h2>
        <p>
          If you make a group booking, you confirm that you are authorized to
          provide each participant&apos;s name and booking details, request the
          appointments, and receive booking communications for the group. You
          must provide accurate information and make participants aware of
          these terms and the Privacy Policy. Do not provide information that
          is unnecessary for arranging the requested services.
        </p>
      </section>

      <section>
        <h2>5. Prices and in-shop payment</h2>
        <p>
          The website does not currently implement online payment. Payment is
          made at the shop using the methods accepted there at the time of
          service. Displayed prices relate to the selected service; any change
          in service or price should be explained and agreed at the shop. We do
          not collect payment-card details through the booking website.
        </p>
      </section>

      <section>
        <h2>6. Cancellations and no-shows</h2>
        <p>
          If you cannot attend, contact the shop through customer support or
          email as early as practical. The current online service
          does not impose a cancellation fee or fixed cancellation deadline.
          We may record cancellations, reasons, and no-shows to maintain
          accurate operations and address repeated misuse of booking capacity.
          Repeated or abusive no-shows or reservations may result in booking
          restrictions or account action after reasonable review.
        </p>
      </section>

      <section>
        <h2>7. Support, notifications, and feedback</h2>
        <p>
          Support messages must be relevant and respectful. In-app notices may
          be used for service communications. Browser push notifications are
          optional; you may unsubscribe through available account or browser
          controls, though essential booking information may still be shown in
          the service or sent through another appropriate channel.
        </p>
        <p>
          Feedback is optional. By submitting a rating or comment, you allow
          TOL Barbershop to use it for service evaluation and business
          transparency, including display on the public website with your
          customer name, service, and barber information. Eligible five-star
          comments may appear automatically, and staff may select feedback for
          featured display. This helps prospective customers assess services
          through authentic customer experiences.
        </p>
      </section>

      <section>
        <h2>8. Your content</h2>
        <p>
          You retain rights you hold in notes, messages, feedback, profile
          media, and other content you submit. You give TOL Barbershop a
          non-exclusive license to host, copy, display internally, and process
          that content only as reasonably needed to operate, secure, support,
          document, and explain the service. For submitted feedback, this
          license also includes the public use described above.
        </p>
        <p>
          You confirm that you have the rights and permissions needed for your
          content and that it is accurate where relevant. Do not submit content
          that is unlawful, threatening, deceptive, defamatory, invasive of
          privacy, infringing, malicious, or unrelated to the service.
        </p>
      </section>

      <section>
        <h2>9. Acceptable use</h2>
        <p>You must not:</p>
        <ul>
          <li>
            access another person&apos;s account or restricted staff functions;
          </li>
          <li>
            make fraudulent, automated, speculative, or deliberately
            conflicting bookings;
          </li>
          <li>
            disrupt the service, bypass security or rate limits, introduce
            malicious code, scrape protected data, or probe for vulnerabilities
            without written authorization;
          </li>
          <li>
            impersonate another person or misuse participant, customer, staff,
            support, or notification data; or
          </li>
          <li>use the service to violate law or another person&apos;s rights.</li>
        </ul>
      </section>

      <section>
        <h2>10. TOL Barbershop materials</h2>
        <p>
          The website, TOL Barbershop branding, layout, text, graphics,
          photographs, and software are owned by or licensed to TOL Barbershop
          unless stated otherwise. These terms permit personal use of the
          service but do not transfer intellectual property rights.
        </p>
      </section>

      <section>
        <h2>11. Service availability and changes</h2>
        <p>
          We may maintain, update, suspend, replace, or discontinue features,
          services, schedules, staff assignments, and content. We aim to keep
          booking information accurate but do not promise uninterrupted or
          error-free availability. We will communicate material changes when
          reasonably appropriate.
        </p>
      </section>

      <section>
        <h2>12. Responsibility and consumer rights</h2>
        <p>
          To the extent permitted by Philippine law, each party is responsible
          for direct loss caused by its breach, negligence, or unlawful act.
          TOL Barbershop is not responsible for delay or failure caused by
          events reasonably outside its control, or for third-party services
          that it does not control. Nothing in these terms excludes liability
          that cannot lawfully be excluded or limits rights and remedies under
          applicable Philippine consumer, privacy, or other mandatory law.
        </p>
      </section>

      <section>
        <h2>13. Suspension, deactivation, and records</h2>
        <p>
          We may restrict or deactivate access when reasonably necessary to
          protect customers, staff, the shop, or the service; investigate a
          violation; comply with law; or respond to repeated misuse. You may
          request account deletion through the available feature. Account
          deletion is a soft deactivation, and operational records may be
          retained as explained in the Privacy Policy.
        </p>
      </section>

      <section>
        <h2>14. Governing law and disputes</h2>
        <p>
          These terms are governed by Philippine law. The parties should first
          attempt to resolve a dispute in good faith by contacting one another.
          Subject to mandatory consumer venue and procedural rights, disputes
          that require court proceedings will be brought before a court of
          competent jurisdiction in Cavite, Philippines.
        </p>
      </section>

      <section>
        <h2>15. Changes, severability, and contact</h2>
        <p>
          We may update these terms for service, operational, or legal changes.
          The effective date identifies the current version. If one provision
          is unenforceable, the remaining provisions continue to apply to the
          extent permitted by law.
        </p>
        <p>
          Questions may be sent to{" "}
          <a href="mailto:tolbarbershop23@gmail.com">
            tolbarbershop23@gmail.com
          </a>
          .
        </p>
      </section>
    </LegalDocument>
  );
}
