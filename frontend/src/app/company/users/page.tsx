"use client";

import { useState } from "react";
import { api } from "@/lib/apiClient";

export default function CompanyUsersPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    sendInvite: true,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.sendInvite && !formData.password) {
      setError("Password is required when not sending an invite.");
      return;
    }

    setIsLoading(true);
    try {
      await api.company.createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password || undefined,
        sendInvite: formData.sendInvite,
      });
      setSuccess(`User ${formData.email} added successfully!`);
      setFormData({ name: "", email: "", password: "", sendInvite: true });
    } catch (err: any) {
      setError(err.message || "Failed to add user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
              Company Settings: Team Members
            </h2>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Invite a Team Member
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
              <p>Add a new user to your company's workspace.</p>
            </div>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <input
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-6 flex items-start mt-2">
                  <div className="flex items-center h-5">
                    <input
                      name="sendInvite"
                      type="checkbox"
                      checked={formData.sendInvite}
                      onChange={handleChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label className="font-medium text-gray-700 dark:text-gray-300">
                      Send Invite Email
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">
                      Send an email with a link to accept the invite. If disabled, you must set their initial password.
                    </p>
                  </div>
                </div>

                {!formData.sendInvite && (
                  <div className="sm:col-span-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Initial Password
                    </label>
                    <input
                      name="password"
                      type="password"
                      required={!formData.sendInvite}
                      minLength={8}
                      value={formData.password}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-green-600 text-sm font-medium bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                  {success}
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? "Processing..." : (formData.sendInvite ? "Send Invite" : "Create User")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
