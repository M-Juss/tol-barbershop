import type { Metadata } from "next";

import { LegalDocument } from "@/app/(legal)/_components/LegalDocument";

export const metadata: Metadata = {
  title: "Data Compliance | TOL Barbershop",
  description:
    "A practical summary of TOL Barbershop data protection controls and compliance approach.",
};

export default function DataComplianceDocument() {
  return (
    <LegalDocument
      title="Data Compliance Statement"
      summary="This statement summarizes the practical data-protection controls used by TOL Barbershop. It is a transparency statement, not a certification or guarantee."
    >
      <section>
        <h2>1. Scope and framework</h2>
        <p>
          TOL Barbershop operates account, booking, walk-in, group-booking,
          support, feedback, notification, CRM, and operational analytics
          functions. Our compliance approach is guided by Republic Act No.
          10173, the Data Privacy Act of 2012, its Implementing Rules and
          Regulations, and applicable issuances of the National Privacy
          Commission. Our Privacy Policy gives the detailed notice for data
          subjects.
        </p>
      </section>

      <section>
        <h2>2. Data handling principles</h2>
        <p>Our implementation is designed around these practices:</p>
        <ul>
          <li>
            collect data relevant to account, booking, support, feedback,
            notification, security, and shop-management purposes;
          </li>
          <li>
            validate and sanitize submitted fields and limit public API
            responses to intended information;
          </li>
          <li>
            use personal data for stated operational, contractual, consent,
            legal, and security purposes rather than unrelated advertising;
          </li>
          <li>
            separate public, customer, administrative, and management actions
            through authenticated and role-restricted routes; and
          </li>
          <li>
            preserve operational records only while justified by purpose,
            integrity, security, dispute, or legal needs.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Current technical and access controls</h2>
        <p>The application currently uses:</p>
        <ul>
          <li>
            hashed passwords, email verification, server-managed cookie
            sessions, Sanctum authentication, and CSRF tokens for
            state-changing requests;
          </li>
          <li>
            customer, admin, and manager role checks, with additional
            role-appropriate access to booking, customer, support, feedback,
            and reporting functions;
          </li>
          <li>
            frontend and backend validation, server-side input sanitization,
            output escaping through the application framework, and restricted
            API resources;
          </li>
          <li>
            per-route request throttling for authentication, booking, account,
            support, notification, administrative, and public endpoints;
          </li>
          <li>
            response headers addressing framing, content-type sniffing,
            referrer information, browser permissions, and HTTPS transport
            policy when the request is served securely; and
          </li>
          <li>
            account, session, request, timestamp, and security-related records
            needed to operate and investigate the service.
          </li>
          <li>
            server-recorded versions and timestamps for required registration
            acknowledgements, an optional browser push notification choice, and
            clear terms explaining the internal and public use of submitted
            feedback.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Staff and provider access</h2>
        <p>
          Staff access is assigned by system role and function. Administrators
          and managers may access customer, appointment, support, feedback, and
          reporting data where their assigned responsibilities require it.
          Access controls reduce exposure but do not replace staff
          confidentiality and careful handling obligations.
        </p>
        <p>
          Hosting, email, Cloudinary, Google Maps, and browser or platform push
          providers may process limited data needed for their service. Provider
          location can result in cross-border processing. Selection and use of
          providers should account for purpose, data involved, access, and
          appropriate contractual or organizational safeguards.
        </p>
      </section>

      <section>
        <h2>5. Retention, deactivation, and disposal</h2>
        <p>
          TOL Barbershop does not apply one fixed purge period to all data.
          Retention is assessed using account and booking status, continuing
          operational value, record integrity, security, disputes, limitation
          periods, and legal or accounting duties. Different rules may be
          appropriate for sessions, reset records, push subscriptions,
          appointments, support messages, feedback, and security logs.
        </p>
        <p>
          Account deletion currently uses soft deactivation. It does not
          immediately erase all connected data. Historical booking, walk-in,
          group, support, feedback, notification, and identity-snapshot records
          may be retained where justified. Account access, active sessions,
          access tokens, and push subscriptions are ended during deactivation.
          Historical feedback may remain available as described in the Privacy
          Policy and Terms of Use. Data is reviewed for deletion,
          anonymization, or restriction when its retention basis ends and
          disposal is technically and legally practicable.
        </p>
      </section>

      <section>
        <h2>6. Requests and complaints</h2>
        <p>
          Requests for access, correction, objection, consent withdrawal,
          portability, erasure, or blocking are reviewed against the requestor&apos;s
          identity, the data involved, and applicable legal exceptions. Full
          or immediate erasure may not be possible when records must be kept
          for lawful operations, another person&apos;s rights, security, or legal
          claims. Data subjects may complain to the National Privacy Commission
          if they believe their rights have been violated.
        </p>
      </section>

      <section>
        <h2>7. Security incident approach</h2>
        <p>
          A suspected personal-data incident should be assessed, contained,
          documented, and remediated according to its nature and risk. TOL
          Barbershop will notify affected data subjects and the National
          Privacy Commission when notification is required by Philippine law.
          Records may be preserved as needed to investigate and prevent
          recurrence.
        </p>
      </section>

      <section>
        <h2>8. Important limitations</h2>
        <p>
          This statement does not claim an external privacy or information
          security certification. The current service does not represent that
          it uses multi-factor authentication or database encryption at rest,
          and it does not promise fixed purge periods, complete immediate
          erasure, uninterrupted operation, or guaranteed security. Controls
          must be reviewed as the system, providers, risks, and legal
          requirements change.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          Questions, rights requests, and security or privacy reports may be
          sent to{" "}
          <a href="mailto:ofcl.tolbarbershop@gmail.com">
            ofcl.tolbarbershop@gmail.com
          </a>
          , or delivered to TOL Barbershop, 2nd Floor, Osrem Building, Gen.
          Trias Drive, Tejero, General Trias City, Cavite, Philippines.
        </p>
      </section>
    </LegalDocument>
  );
}
