import type { Metadata } from "next";

import { LegalDocument } from "@/app/(legal)/_components/LegalDocument";

export const metadata: Metadata = {
  title: "IP Infringement Policy | TOL Barbershop",
  description:
    "How to report and respond to intellectual property infringement involving TOL Barbershop services.",
};

export default function IpInfringementDocument() {
  return (
    <LegalDocument
      title="IP Infringement Policy"
      summary="This Philippine-oriented process explains how rights holders and affected users can report and respond to intellectual property concerns involving the TOL Barbershop service."
    >
      <section>
        <h2>1. Scope</h2>
        <p>
          TOL Barbershop respects copyright, trademark, and other intellectual
          property rights under the Intellectual Property Code of the
          Philippines, Republic Act No. 8293, as amended, and other applicable
          law. This policy covers content available through our website,
          gallery, feedback or testimonial displays, support channels, and
          other service features.
        </p>
      </section>

      <section>
        <h2>2. Ownership and permitted use</h2>
        <p>
          TOL Barbershop or its licensors own the service&apos;s branding, original
          text, photographs, graphics, interface, and software, except for user
          content and identified third-party materials. Access to the service
          does not grant permission to reproduce, distribute, modify, sell, or
          publicly exploit those materials beyond personal use or another use
          authorized in writing or by law.
        </p>
        <p>
          Users retain rights in content they submit but must have authority to
          submit it. The limited processing license in the Terms of Use allows
          TOL Barbershop to operate the service; it does not transfer ownership
          of user content.
        </p>
      </section>

      <section>
        <h2>3. Submitting an infringement complaint</h2>
        <p>
          Send a complaint with the subject &quot;IP Infringement Complaint&quot; to{" "}
          <a href="mailto:ofcl.tolbarbershop@gmail.com">
            ofcl.tolbarbershop@gmail.com
          </a>
          . A complete complaint should include:
        </p>
        <ul>
          <li>
            your full name, organization if applicable, postal address, email,
            and telephone number;
          </li>
          <li>
            identification of the protected work, mark, or other right and the
            basis of your ownership or authority to act for the rights holder;
          </li>
          <li>
            the exact service location of the challenged material, such as a
            URL, page, image, or feedback entry, with enough information to find
            it;
          </li>
          <li>
            an explanation of why the use infringes and any supporting
            registration, license, authorization, or other record;
          </li>
          <li>
            a good-faith statement that the challenged use is not authorized
            by the rights holder, its representative, or applicable law;
          </li>
          <li>
            a statement that the information is accurate and that you are the
            rights holder or authorized to act for that person; and
          </li>
          <li>your physical or verifiable electronic signature.</li>
        </ul>
      </section>

      <section>
        <h2>4. Review process</h2>
        <p>
          We may preserve relevant records, seek clarification, contact the
          person who supplied the material, restrict access during review, or
          remove material when reasonably warranted. We may decline action
          where a complaint is incomplete, outside our control, unsupported,
          or requires a competent authority to decide.
        </p>
        <p>
          Any action is taken without admitting liability or making a final
          judicial determination. We may disclose the complaint and contact
          information where reasonably needed to evaluate or resolve the matter
          and as permitted by our Privacy Policy and law.
        </p>
      </section>

      <section>
        <h2>5. Counter-notice</h2>
        <p>
          A person whose material was restricted or removed may send a
          counter-notice with the subject &quot;IP Counter-Notice&quot; to the same email
          address. It should identify the affected material, explain the basis
          for restoration, include current contact details and supporting
          records, provide an accuracy and good-faith statement, and include a
          physical or verifiable electronic signature.
        </p>
        <p>
          We may provide the counter-notice to the complainant and request a
          response. Depending on the evidence, any court or agency direction,
          and applicable law, we may keep the restriction, restore the
          material, or require the parties to obtain a determination from the
          proper authority. No automatic restoration period applies.
        </p>
      </section>

      <section>
        <h2>6. Repeat infringement and misrepresentation</h2>
        <p>
          TOL Barbershop may warn, restrict, suspend, or deactivate a user who
          repeatedly submits infringing material. We assess substantiated
          reports rather than applying an automatic fixed-strike rule. Do not
          knowingly submit a false, misleading, or abusive complaint or
          counter-notice. A person making material misrepresentations may be
          responsible for resulting loss or other remedies under applicable
          law.
        </p>
      </section>

      <section>
        <h2>7. Governing law and contact</h2>
        <p>
          This policy and reports made under it are governed by Philippine law.
          Subject to mandatory rights and venue rules, related court proceedings
          will be brought before a court of competent jurisdiction in Cavite,
          Philippines.
        </p>
        <p>
          Contact TOL Barbershop at{" "}
          <a href="mailto:ofcl.tolbarbershop@gmail.com">
            ofcl.tolbarbershop@gmail.com
          </a>
          , or at 2nd Floor, Osrem Building, Gen. Trias Drive, Tejero, General
          Trias City, Cavite, Philippines.
        </p>
      </section>
    </LegalDocument>
  );
}
