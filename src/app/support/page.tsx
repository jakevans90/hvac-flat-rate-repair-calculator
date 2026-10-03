import LegalPage from "@/components/legal-page";

export default function SupportPage() {
  return <LegalPage title="Support">
    <p>If the calculator is not behaving as expected, first use “Reset calculator” to clear the saved local draft and reload the page.</p>
    <p>For help or feedback, visit <a className="inline-flex min-h-11 items-center font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4" href="https://jakegenerates.com/">JakeGenerates</a>.</p>
    <p>Do not send private customer information. This calculator does not need customer names, addresses, equipment serial numbers, or payment details.</p>
  </LegalPage>;
}
