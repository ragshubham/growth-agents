'use client';

import Topbar from '@/components/Topbar';

export default function DeleteDataPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Topbar />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-6">Data Deletion Instructions</h1>
        <p className="text-lg mb-4">
          At GrowthAgents, you have full control over your data. If you would like
          us to delete any data associated with your account, you can request this
          at any time.
        </p>
        <p className="text-lg mb-4">
          To request deletion, please email us at{' '}
          <a href="mailto:support@growthagents.io" className="text-indigo-600 underline">
            support@growthagents.io
          </a>{' '}
          with the subject line <strong>Data Deletion Request</strong>.
        </p>
        <p className="text-lg mb-4">
          We will verify your request and permanently delete all associated data
          within <strong>30 days</strong>.
        </p>
        <p className="text-sm text-gray-500">
          If you have any questions, please reach out to our support team.
        </p>
      </main>
    </div>
  );
}
