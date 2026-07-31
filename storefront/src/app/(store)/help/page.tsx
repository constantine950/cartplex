export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold mb-2">Help Center</h1>
      <p className="text-gray-500 mb-12">
        Answers to common questions about CartPlex.
      </p>

      <div className="space-y-10">
        {/* Orders */}
        <section id="orders">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-200">
            Orders
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "How do I track my order?",
                a: "Once your order is shipped, the vendor will update the status in your order history. You'll see statuses like Fulfilling, Shipped, and Delivered.",
              },
              {
                q: "Can I cancel my order?",
                a: "Orders can be cancelled before they move to Fulfilling status. Contact the vendor directly through the platform.",
              },
              {
                q: "What payment methods are accepted?",
                a: "CartPlex accepts all major credit and debit cards via Stripe. Your payment details are never stored on our servers.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group bg-white border border-gray-200 rounded-xl"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 list-none">
                  {item.q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Returns */}
        <section id="returns">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-200">
            Returns
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "What is the return policy?",
                a: "Each vendor sets their own return policy. Check the vendor's storefront page for their specific policy. Generally, items can be returned within 30 days of delivery.",
              },
              {
                q: "How do I initiate a return?",
                a: "Contact the vendor directly through CartPlex. Navigate to your order and use the contact vendor option. Refunds are processed within 5-7 business days.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group bg-white border border-gray-200 rounded-xl"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 list-none">
                  {item.q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section id="contact">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-200">
            Contact
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-sm text-gray-600 mb-4">
              Can't find what you're looking for? Reach out to our support team.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">📧</span>
                <div>
                  <p className="font-medium text-gray-900">Email Support</p>
                  <p className="text-gray-500">support@cartplex.dev</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">⏰</span>
                <div>
                  <p className="font-medium text-gray-900">Response Time</p>
                  <p className="text-gray-500">
                    Within 24 hours on business days
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
