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
      summary="This policy explains how TOL Barbershop handles your personal information when you use our website, book appointments, contact support, or interact with our services."
    >
      <section>
        <h2>1. Who we are</h2>
        <p>
          TOL Barbershop, located at 2nd Floor, Osrem Building, Gen. Trias
          Drive, Tejero, General Trias City, Cavite, Philippines, is the
          company responsible for your personal information. This policy covers
          customers, booking participants, walk-in customers whose details are
          recorded, staff account holders, website visitors, and anyone who
          contacts us.
        </p>
      </section>

      <section>
        <h2>2. What personal information we collect</h2>
        <p>
          Depending on how you use our services, we may collect the following:
        </p>
        <ul>
          <li>
            <strong>Account information:</strong> your full name, email address,
            phone number, account role and status, email verification details,
            and account timestamps. Passwords are stored securely as encrypted
            hashes (we never see or store your actual password). We also record
            password-reset data and your acceptance of our Terms of Use and
            Privacy Policy.
          </li>
          <li>
            <strong>Booking and appointment records:</strong> the service and
            barber you select, appointment date and time, duration, price,
            booking status, group or batch details, participant or customer
            names provided for a booking, walk-in customer name and contact
            number, appointment notes, and cancellation or rejection reasons.
          </li>
          <li>
            <strong>Support conversations:</strong> ticket category, subject,
            messages, assigned staff member, status, cancellation reason,
            resolution notes, message timestamps, and identity information
            needed to maintain the support record.
          </li>
          <li>
            <strong>Reviews and feedback:</strong> your rating, comments,
            customer name snapshot, related service and barber information,
            appointment references, and whether your feedback is selected for
            featured display. Eligible five-star comments may also appear on
            our public website to help other customers make informed choices.
          </li>
          <li>
            <strong>Notifications:</strong> in-app notification messages, read
            status, and, if you enable browser push notifications, the push
            endpoint and encryption keys needed to deliver messages to your
            browser.
          </li>
          <li>
            <strong>Technical and security data:</strong> session and
            authentication cookies, security tokens, IP address, browser type,
            request and response information, activity timestamps, and
            application or security logs.
          </li>
          <li>
            <strong>Business analytics:</strong> customer and appointment
            history and operational data such as booking volume, revenue,
            services performed, barber performance, ratings, peak hours, and
            no-show or cancellation patterns. Reports are aggregated where
            practical.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How we collect your information</h2>
        <p>
          We collect information directly from you when you register, book an
          appointment, contact support, submit feedback, update your profile,
          or enable push notifications. A group booker may provide participant
          names and booking details, and staff may record walk-in or shop
          management information. Your browser, our servers, and service
          providers also generate technical data automatically when you use
          our services.
        </p>
      </section>

      <section>
        <h2>4. Why we use your information</h2>
        <p>We use your personal information to:</p>
        <ul>
          <li>
            create and protect accounts, verify email addresses, authenticate
            users, and help you recover access;
          </li>
          <li>
            receive, review, approve, schedule, update, complete, cancel, and
            document individual, group, and walk-in appointments;
          </li>
          <li>
            communicate about your bookings, provide customer support, deliver
            notifications you have requested, and respond to inquiries;
          </li>
          <li>
            manage customer relationships, services, staffing, shop capacity,
            records, and operational reporting;
          </li>
          <li>
            prevent misuse, enforce access permissions, troubleshoot issues,
            protect the service, and establish or defend legal claims; and
          </li>
          <li>
            comply with applicable legal, accounting, and recordkeeping
            requirements.
          </li>
        </ul>
        <p>
          Our legal basis may be your consent, steps taken before or in
          connection with a service you requested, compliance with the law, or
          our legitimate interests in safely operating and improving the shop
          and its systems. Push notifications are optional and require your
          consent. Reviews are optional, but once submitted, they may be used
          internally and publicly as described in this policy and our Terms of
          Use.
        </p>
      </section>

      <section>
        <h2>5. Cookies and third-party services</h2>
        <p>
          <strong>Required cookies</strong> support sessions, role-based access,
          and security protections. If you disable these cookies, account
          features may stop working. Local browser storage may keep form
          cooldown timestamps and your last visited route within an account
          area; the application does not intentionally store booking or support
          content there.
        </p>
        <p>
          Our public website may embed <strong>Google Maps</strong> and load
          images from <strong>Cloudinary</strong>. Google and Cloudinary may
          receive technical information such as your IP address, browser
          details, referrer, and request timestamps under their own terms.
        </p>
        <p>
          We also use hosting and infrastructure providers, email delivery
          services, and browser or platform push-notification providers. They
          may process account, message, device, or log data only as needed to
          provide those functions. Your browser or platform provider controls
          its own push-notification environment.
        </p>
      </section>

      <section>
        <h2>6. Who we share your information with</h2>
        <p>
          Your personal information may be accessible to authorized TOL
          Barbershop staff according to their administrative, management,
          scheduling, support, or service responsibilities. We may share
          limited data with the service providers described above, professional
          advisers, authorities when legally required, or a successor involved
          in a legitimate business transfer. <strong>
          We do not sell your personal information.
          </strong>
        </p>
        <p>
          Some providers may process or store data outside the Philippines.
          Where this occurs, we use providers and arrangements intended to
          preserve protections consistent with the Data Privacy Act of 2012,
          taking into account the type of data, the purpose, the destination,
          and available contractual or organizational safeguards.
        </p>
      </section>

      <section>
        <h2>7. How long we keep your information</h2>
        <p>
          We keep your information for as long as needed to serve its purpose.
          We consider factors such as whether an account or booking is active,
          the need to operate the shop and maintain accurate appointment and
          support history, security and dispute needs, applicable limitation
          periods, and legal, tax, or regulatory obligations. Session, reset,
          push, and security data may have different retention periods from
          operational records.
        </p>
        <p>
          When you request account deletion, your account is{" "}
          <strong>deactivated</strong> (disabled) rather than immediately erased.
          Appointment, group, walk-in, support, feedback, notification, and
          consent records may be retained where needed for the reasons above,
          including as snapshots that preserve the integrity of past
          transactions. When data is no longer needed, we delete, anonymize,
          or restrict it where reasonably practicable and legally permitted.
          Push subscriptions are removed from our active records when you
          unsubscribe or deactivate your account, and invalid endpoints are
          removed when delivery fails.
        </p>
      </section>

      <section>
        <h2>8. How we protect your information</h2>
        <p>
          We use password hashing, verified account and cookie-based
          authentication, security protections against unauthorized requests,
          role-restricted access, input validation and sanitization, request
          rate limits, and browser security headers. Access is limited
          according to each staff member&apos;s role and operational need. No
          internet service or storage method is completely secure, so we
          cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>9. Your rights under Philippine data privacy law</h2>
        <p>
          Under the Data Privacy Act of 2012 and its implementing rules, you
          may have the right to be informed about how your data is processed;
          object to processing; access your personal data; correct inaccurate
          data; request erasure, blocking, or restriction; obtain data
          portability where applicable; withdraw consent; and seek damages for
          a violation. Withdrawing consent does not invalidate earlier lawful
          processing.
        </p>
        <p>
          To exercise any of these rights, email us with enough information to
          identify you and your request. We may verify your identity and may
          retain or continue processing data where the law or a compelling
          operational or legal basis permits. You may also file a complaint
          with the National Privacy Commission through its current channels at{" "}
          <a href="https://privacy.gov.ph/" target="_blank" rel="noreferrer">
            privacy.gov.ph
          </a>
          .
        </p>
      </section>

      <section>
        <h2>10. Your choices</h2>
        <p>
          You may disable push notifications in your account or browser
          settings. You may ask us to review or remove public feedback where
          appropriate; removing a displayed review does not affect lawful prior
          use or records that must be retained. You may update account details
          through your account settings or contact us if those controls are
          unavailable.
        </p>
      </section>

      <section>
        <h2>11. Changes to this policy and how to contact us</h2>
        <p>
          We may update this policy when our services or legal obligations
          change. The effective date shown at the top identifies the current
          version. Material changes will be communicated through an appropriate
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
