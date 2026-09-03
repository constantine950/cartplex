"use client";

import { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      slug
      name
    }
  }
`;

const ADD_VARIANT = gql`
  mutation AddVariant($productId: String!, $input: CreateVariantInput!) {
    addVariant(productId: $productId, input: $input) {
      id
      sku
      inventoryCount
    }
  }
`;

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("cartplex_token") ?? "";
}

const CATEGORIES = [
  "Audio",
  "Peripherals",
  "Accessories",
  "Storage",
  "Cameras",
  "Kitchen",
  "Decor",
  "Bedroom",
  "Organization",
  "Outerwear",
  "Tops",
  "Bottoms",
  "Dresses",
  "Bags",
  "Footwear",
  "Other",
];

export default function NewProductPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [productId, setProductId] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    tags: "",
    basePrice: "",
    images: "",
  });
  const [variant, setVariant] = useState({
    sku: "",
    inventoryCount: "10",
    priceModifier: "0",
  });
  const [error, setError] = useState("");

  const ctx = {
    context: { headers: { Authorization: `Bearer ${getToken()}` } },
  };

  const [createProduct, { loading: creating }] = useMutation(CREATE_PRODUCT, {
    ...ctx,
    onCompleted: (data) => {
      setProductId(data.createProduct.id);
      setVariant((v) => ({
        ...v,
        sku: data.createProduct.slug + "-default",
      }));
      setStep(2);
    },
    onError: (err) => setError(err.message),
  });

  const [addVariant, { loading: addingVariant }] = useMutation(ADD_VARIANT, {
    ...ctx,
    onCompleted: () => {
      toast("Product created successfully!", "success");
      router.push("/vendor-dashboard/products");
    },
    onError: (err) => setError(err.message),
  });

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    await createProduct({
      variables: {
        input: {
          name: form.name,
          description: form.description || undefined,
          category: form.category,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
          basePrice: parseFloat(form.basePrice),
          images: form.images
            ? form.images.split(",").map((i) => i.trim())
            : [],
        },
      },
    });
  }

  async function handleAddVariant(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    await addVariant({
      variables: {
        productId,
        input: {
          sku: variant.sku,
          options: { type: "standard" },
          inventoryCount: parseInt(variant.inventoryCount),
          priceModifier: parseFloat(variant.priceModifier),
        },
      },
    });
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold">New Product</h1>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-3 mb-8">
        {[
          { n: 1, label: "Product Details" },
          { n: 2, label: "Inventory" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.n ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"}`}
              >
                {step > s.n ? "✓" : s.n}
              </div>
              <span
                className={`text-sm font-medium ${step >= s.n ? "text-gray-900" : "text-gray-400"}`}
              >
                {s.label}
              </span>
            </div>
            {i < 1 && (
              <div
                className={`flex-1 h-px ${step > s.n ? "bg-gray-900" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — Product details */}
      {step === 1 && (
        <form
          onSubmit={handleCreateProduct}
          className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product name *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Wireless Noise-Cancelling Headphones"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Describe your product..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base price ($) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.basePrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, basePrice: e.target.value }))
                }
                required
                placeholder="29.99"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags{" "}
              <span className="text-gray-400 font-normal">
                (comma separated)
              </span>
            </label>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="wireless, audio, premium"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URLs{" "}
              <span className="text-gray-400 font-normal">
                (comma separated)
              </span>
            </label>
            <input
              value={form.images}
              onChange={(e) =>
                setForm((f) => ({ ...f, images: e.target.value }))
              }
              placeholder="https://example.com/image.jpg"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            className="w-full bg-gray-900 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {creating ? "Creating..." : "Continue →"}
          </button>
        </form>
      )}

      {/* Step 2 — Inventory */}
      {step === 2 && (
        <form
          onSubmit={handleAddVariant}
          className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-4"
        >
          <p className="text-sm text-gray-500 mb-2">
            Set up the initial inventory for your product.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU *
            </label>
            <input
              value={variant.sku}
              onChange={(e) =>
                setVariant((v) => ({ ...v, sku: e.target.value }))
              }
              required
              placeholder="my-product-default"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial stock *
              </label>
              <input
                type="number"
                min="0"
                value={variant.inventoryCount}
                onChange={(e) =>
                  setVariant((v) => ({ ...v, inventoryCount: e.target.value }))
                }
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price modifier ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={variant.priceModifier}
                onChange={(e) =>
                  setVariant((v) => ({ ...v, priceModifier: e.target.value }))
                }
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:border-gray-400 transition-colors"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={addingVariant}
              className="flex-1 bg-gray-900 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {addingVariant ? "Publishing..." : "Publish product"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
