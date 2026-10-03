import LegalPage from "@/components/legal-page";

export default function PrivacyPage() {
  return <LegalPage title="Privacy">
    <p>This calculator is designed to keep your pricing inputs on your device. Calculator entries are not sent to a JakeGenerates server.</p>
    <h2 className="text-xl font-bold text-slate-900">Browser-local draft</h2>
    <p>Your browser may save one draft in localStorage so your inputs can be restored when you return. You can remove it with the calculator’s reset button or by clearing this site’s browser data.</p>
    <h2 className="text-xl font-bold text-slate-900">No account or cloud sync</h2>
    <p>This V1 has no account, application database, or cloud history. If browser storage is unavailable, the calculator still works for the current session but cannot restore your draft later.</p>
    <h2 className="text-xl font-bold text-slate-900">Analytics</h2>
    <p>JakeGenerates uses Google Analytics to understand page visits and calculator completion. The anonymous tool_visit and tool_complete events may include the tool name, tool category, visitor type, and selected pricing mode. They never include user-entered prices, hours, costs, or descriptions. Analytics may also receive device, browser, page, and approximate-location information.</p>
  </LegalPage>;
}
