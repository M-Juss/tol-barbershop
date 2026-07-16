import type { Metadata } from "next";

import { LegalDocument } from "@/app/(legal)/_components/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy | TOL Barbershop",
  description:
    "How TOL Barbershop collects, uses, shares, secures, and retains personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      summary="This policy explains how TOL Barbershop handles personal data through its website, booking, customer support, notification, feedback, and shop-management services."
    >
      <section>
        <h2>1. Who we are and what this covers</h2>
        <p>
          TOL Barbershop is the personal information controller for the
          processing described here. This policy covers customers, group
          booking participants, walk-in customers whose details are recorded,
          staff account users, website visitors, and people who contact us. It applies to our
          website and the connected appointment, customer relationship,
          support, feedback, notification, and administrative functions.
        </p>
      </section>

      <section>
        <h2>2. Personal data we handle</h2>
        <p>Depending on how you use the service, we may handle:</p>
        <ul>
          <li>
            <strong>Account data:</strong> full name, email address, contact
            number, account role and status, email
            verification information, and account timestamps. Passwords are
            stored as hashes rather than readable passwords. Password-reset
            data and the accepted Terms and Privacy Policy versions and
            acceptance timestamp may also be processed.
          </li>
          <li>
            <strong>Booking and shop records:</strong> selected service and
            barber, appointment date and time, duration, price, status,
            booking reference, group or batch details, participant or customer
            names supplied for a booking, walk-in customer name and contact
            number, walk-in status, appointment notes, and cancellation or
            rejection reasons. Staff may enter walk-in and operational booking
            information.
          </li>
          <li>
            <strong>Support and communications:</strong> ticket category,
            subject, messages, assigned staff, status, cancellation reason,
            resolution notes, message timestamps, and identity snapshots
            needed to preserve the support record.
          </li>
          <li>
            <strong>Feedback and testimonials:</strong> ratings, comments,
            customer name snapshots, related service and barber information,
            appointment references, and whether feedback is selected for
            featured display. Submitted five-star comments may also appear on
            the public website to provide transparency and help prospective
            customers understand actual service experiences.
          </li>
          <li>
            <strong>Notifications:</strong> in-app notifications, read status,
            and, if you enable browser push, the push endpoint and associated
            p256dh and authentication keys needed to deliver messages.
          </li>
          <li>
            <strong>Technical and security data:</strong> session and
            authentication cookies, CSRF tokens, IP address, user-agent,
            request and response information, activity timestamps, and
            application, hosting, error, and security logs.
          </li>
          <li>
            <strong>CRM and analytics data:</strong> customer and appointment
            history and operational measures such as booking volume, revenue,
            services, barber performance, ratings, peak hours, and no-show or
            cancellation patterns. Reports may be aggregated where practical.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How we obtain data</h2>
        <p>
          We receive data from you when you register, book, contact support,
          submit feedback, update your profile, or enable notifications. A
          group booker may provide participant names and booking details, and
          staff may record walk-in or shop-management information. Browsers,
          servers, and service providers also generate technical data
          automatically when the service is used.
        </p>
      </section>

      <section>
        <h2>4. Why we process data</h2>
        <p>We process personal data as needed to:</p>
        <ul>
          <li>
            create and secure accounts, verify email addresses, authenticate
            users, and recover access;
          </li>
          <li>
            receive, review, approve, schedule, update, complete, cancel, and
            document individual, group, and walk-in appointments;
          </li>
          <li>
            communicate about bookings, provide customer support, deliver
            requested notifications, and respond to inquiries and rights
            requests;
          </li>
          <li>
            manage customer relationships, services, staffing, shop capacity,
            records, and operational reporting;
          </li>
          <li>
            prevent misuse, enforce access permissions, troubleshoot, protect
            the service, and establish or defend legal claims; and
          </li>
          <li>
            comply with applicable legal, regulatory, accounting, and
            recordkeeping duties.
          </li>
        </ul>
        <p>
          The applicable basis may be your consent, steps requested before or
          performance of a service arrangement, compliance with law, or our
          legitimate interests in safely operating and improving the shop and
          its systems. Push notifications are consent-based and optional.
          Feedback is optional, but submitted feedback may be used internally
          and publicly as described in this policy and the Terms of Use.
        </p>
      </section>

      <section>
        <h2>5. Cookies and connected providers</h2>
        <p>
          Required cookies support sessions, role-aware navigation, and CSRF
          protection. Disabling them may prevent account features from
          working. Local browser storage may retain form cooldown timestamps
          and the last route visited within an account area; the application
          does not intentionally place booking or support content there. The
          public site may embed Google Maps and load media from
          Cloudinary. Google and Cloudinary may receive technical information
          such as your IP address, browser details, referrer, and request
          timestamps under their own terms.
        </p>
        <p>
          We also rely on hosting and infrastructure providers, email delivery
          providers, and browser or platform push providers. They may process
          account, message, delivery, device, or log data only as needed to
          provide those functions. Your browser or platform provider controls
          its own push-notification environment.
        </p>
      </section>

      <section>
        <h2>6. Disclosure and cross-border processing</h2>
        <p>
          Personal data may be available to authorized TOL Barbershop staff
          according to their administrative, management, scheduling, support,
          or service responsibilities. We may disclose limited data to the
          providers described above, professional advisers, authorities when
          legally required, or a successor involved in a legitimate business
          transfer. We do not sell personal data.
        </p>
        <p>
          Some providers may process or store data outside the Philippines.
          Where this occurs, we use providers and arrangements intended to
          preserve protections consistent with the Data Privacy Act of 2012,
          taking account of the data, purpose, destination, and available
          contractual or organizational safeguards.
        </p>
      </section>

      <section>
        <h2>7. Retention and account deactivation</h2>
        <p>
          Retention is based on purpose rather than one fixed period. Relevant
          criteria include whether an account or booking is active, the need
          to operate the shop and preserve accurate appointment and support
          history, security and dispute needs, applicable limitation periods,
          and legal, tax, accounting, or regulatory obligations. Session,
          reset, push, and security data may have different useful lives from
          operational records.
        </p>
        <p>
          An account deletion request currently soft-deactivates the account;
          it does not guarantee immediate deletion of every related record.
          Appointment, group, walk-in, support, feedback, notification, and
          consent or other compliance-relevant operational records may remain
          where needed for the criteria above, including as snapshots that
          preserve the integrity of past transactions. When data is no longer needed, we delete,
          anonymize, or restrict it where reasonably practicable and legally
          permitted. Push subscriptions are removed from our active records
          when you unsubscribe or deactivate your account, and invalid
          endpoints are removed when delivery fails.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          Current safeguards include password hashing, verified account and
          cookie-based authentication, CSRF protection, role-restricted
          routes, input validation and sanitization, request rate limits, and
          browser security headers. Access is limited according to system
          role and operational need. No internet service or storage method is
          completely secure, so we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>9. Your rights under Philippine data privacy law</h2>
        <p>
          Subject to the Data Privacy Act of 2012, its rules, and lawful
          exceptions, you may have the right to be informed; object to
          processing; access your personal data; correct inaccurate data;
          request erasure, blocking, or restriction; obtain data portability
          where applicable; withdraw consent; and seek damages for a violation.
          Withdrawing consent does not invalidate earlier lawful processing.
        </p>
        <p>
          To exercise a right, email us with enough information to identify
          you and the request. We may verify your identity and may retain or
          continue processing data where law or a compelling operational or
          legal basis permits. You may also lodge a complaint with the
          National Privacy Commission through its current channels at{" "}
          <a href="https://privacy.gov.ph/" target="_blank" rel="noreferrer">
            privacy.gov.ph
          </a>
          .
        </p>
      </section>

      <section>
        <h2>10. Your choices</h2>
        <p>
          You may disable push notifications in your account or browser and
          may ask us to review or remove public feedback where appropriate.
          Removing a displayed review does not affect lawful prior use or
          records that must be retained.
          You may update account details through available account controls or
          contact us if those controls are unavailable.
        </p>
      </section>

      <section>
        <h2>11. Changes and contact</h2>
        <p>
          We may revise this policy when our services or legal obligations
          change. The effective date above identifies the current version.
          Material changes will be communicated through an appropriate
          service channel where required.
        </p>
        <p>
          For privacy questions or requests, contact TOL Barbershop at{" "}
          <a href="mailto:tolbarbershop23@gmail.com">
            tolbarbershop23@gmail.com
          </a>
          , or at 2nd Floor, Osrem Building, Gen. Trias Drive, Tejero, General
          Trias City, Cavite, Philippines.
        </p>
      </section>
    </LegalDocument>
  );
}
