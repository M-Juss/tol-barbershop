import { InputWithLabel } from "@/components/common/InputWithLabel";

export function AccountInformationForm() {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-4">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            Account Information
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">Your personal details</p>
        </div>
        <button className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors">
          Edit
        </button>
      </div>

      <form className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        <InputWithLabel
          id="full-name"
          label="Full Name"
          value="John Dela Cruz"
          disabled
          className="h-10 border-gray-200 text-gray-500"
        />

        <InputWithLabel
          id="email"
          type="email"
          label="Email"
          value="john.delacruz@email.com"
          disabled
          className="h-10 border-gray-200 text-gray-500"
        />

        <InputWithLabel
          id="contact-number"
          label="Contact Number"
          value="+63 912 345 6789"
          disabled
          className="h-10 border-gray-200 text-gray-500"
        />

        <InputWithLabel
          id="member-since"
          label="Member Since"
          value="January 15, 2024"
          disabled
          className="h-10 border-gray-200 text-gray-500"
        />
      </form>
    </div>
  );
}
