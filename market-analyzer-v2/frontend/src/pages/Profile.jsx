import React, { useState, useEffect, useRef } from "react";
import { User, Mail, Phone, MapPin, Camera, Shield } from "lucide-react";

const Profile = () => {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    role: "User",
    avatar: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  const fileInputRef = useRef(null);

  const getUserEmail = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) return JSON.parse(userStr).email;
      return localStorage.getItem("email");
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const email = getUserEmail();
      if (!email) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:5000/api/user/profile?email=${encodeURIComponent(
            email
          )}`
        );
        if (response.ok) {
          const data = await response.json();
          setProfile((prev) => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setMessage({ type: "error", text: "Failed to load profile." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const email = getUserEmail();
    if (!email) {
      setMessage({ type: "error", text: "No email found for current user." });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("email", email);

    setMessage({ type: "info", text: "Uploading image..." });

    try {
      const response = await fetch("http://localhost:5000/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setProfile((prev) => ({ ...prev, avatar: data.avatar_url }));
        setMessage({ type: "success", text: "Profile picture updated!" });

        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          user.avatar = data.avatar_url;
          localStorage.setItem("user", JSON.stringify(user));
        }
      } else {
        setMessage({
          type: "error",
          text: data.error || "Upload failed. Try again.",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage({ type: "error", text: "Server error during upload." });
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    const payload = { ...profile, email: profile.email || getUserEmail() };

    try {
      const response = await fetch("http://localhost:5000/api/user/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsEditing(false);
        setMessage({ type: "success", text: "Profile updated successfully!" });
      } else {
        const data = await response.json().catch(() => ({}));
        setMessage({
          type: "error",
          text: data.error || "Profile update failed.",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Connection failed." });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !profile.name) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100">
        <p className="text-sm text-neutral-400">Loading profile...</p>
      </div>
    );
  }

  const avatarSrc = profile.avatar
    ? profile.avatar.startsWith("http")
      ? profile.avatar
      : `http://localhost:5000${profile.avatar}`
    : null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-gradient-to-b from-neutral-900/95 to-neutral-950/95 border border-neutral-800 rounded-3xl shadow-2xl px-8 py-7">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-neutral-800 pb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                My Profile
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Manage your account information and profile picture.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/40">
                <Shield className="w-3.5 h-3.5" />
                {profile.role || "Standard User"}
              </span>
              <button
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm ${
                  isEditing
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                {isEditing ? "Save Changes" : "Edit Profile"}
              </button>
            </div>
          </div>

          {/* Message */}
          {message.text && (
            <div
              className={`mb-6 px-4 py-3 rounded-xl text-sm border ${
                message.type === "error"
                  ? "bg-red-950/50 border-red-800 text-red-200"
                  : message.type === "info"
                  ? "bg-sky-950/40 border-sky-800 text-sky-200"
                  : "bg-emerald-950/40 border-emerald-700 text-emerald-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: avatar + bio */}
            <div className="flex flex-col items-center md:items-start gap-6">
              <div className="relative group">
                <div className="w-40 h-40 rounded-3xl bg-neutral-900 flex items-center justify-center border border-neutral-700 overflow-hidden shadow-xl">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
                      }}
                    />
                  ) : (
                    <span className="text-5xl font-semibold text-neutral-600">
                      {profile.name
                        ? profile.name.charAt(0).toUpperCase()
                        : "U"}
                    </span>
                  )}
                </div>

                {isEditing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-1 right-1 bg-indigo-600 p-2 rounded-full hover:bg-indigo-500 transition-colors shadow-lg border-2 border-neutral-950"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                  accept="image/*"
                />
              </div>

              <div className="w-full">
                <label className="block text-xs text-neutral-400 mb-1.5">
                  Bio
                </label>
                <textarea
                  name="bio"
                  disabled={!isEditing}
                  value={profile.bio || ""}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-neutral-900 rounded-xl p-3 text-sm text-neutral-100 border border-neutral-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 outline-none resize-none placeholder-neutral-500"
                  placeholder="Write a short bio about yourself..."
                />
              </div>
            </div>

            {/* Right: fields */}
            <div className="space-y-5">
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-neutral-500" />
                  <input
                    type="text"
                    name="name"
                    disabled={!isEditing}
                    value={profile.name}
                    onChange={handleChange}
                    className="w-full bg-neutral-900 pl-10 pr-4 py-2.5 rounded-xl text-sm text-neutral-100 border border-neutral-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 outline-none placeholder-neutral-500"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-neutral-500" />
                  <input
                    type="email"
                    name="email"
                    disabled
                    value={profile.email}
                    className="w-full bg-neutral-950 pl-10 pr-4 py-2.5 rounded-xl text-sm text-neutral-500 border border-neutral-800 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-5 w-5 text-neutral-500" />
                  <input
                    type="tel"
                    name="phone"
                    disabled={!isEditing}
                    value={profile.phone}
                    onChange={handleChange}
                    className="w-full bg-neutral-900 pl-10 pr-4 py-2.5 rounded-xl text-sm text-neutral-100 border border-neutral-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 outline-none placeholder-neutral-500"
                    placeholder="+91 98xxxxxxx"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-neutral-500" />
                  <input
                    type="text"
                    name="location"
                    disabled={!isEditing}
                    value={profile.location}
                    onChange={handleChange}
                    className="w-full bg-neutral-900 pl-10 pr-4 py-2.5 rounded-xl text-sm text-neutral-100 border border-neutral-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 outline-none placeholder-neutral-500"
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
