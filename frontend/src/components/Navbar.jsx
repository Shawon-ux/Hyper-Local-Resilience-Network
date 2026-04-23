import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  Menu,
  X,
  Home,
  User,
  LogOut,
  Shield,
  Map,
  Users,
  Box,
  LayoutDashboard,
  Plus,
  List,
  Bell,
  AlertTriangle,
  Radio,
} from "lucide-react";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:9457", {
  autoConnect: false,
});

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [taskMenuOpen, setTaskMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    setShowDropdown(false);
  };

  const fetchUnreadNotifications = async () => {
    try {
      const { data } = await api.get("/notifications/my");
      setUnreadCount(data.filter((item) => !item.isRead).length);
    } catch (err) {
      console.error("Notification error:", err);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (!user?._id) {
      setUnreadCount(0);
      socket.disconnect();
      return;
    }

    fetchUnreadNotifications();
    socket.connect();
    socket.emit("register:user", user._id);

    const handleNotification = () => {
      setUnreadCount((current) => current + 1);
    };
    const handleNotificationsChanged = () => {
      fetchUnreadNotifications();
    };

    socket.on("notification:new", handleNotification);
    window.addEventListener("notifications:changed", handleNotificationsChanged);

    return () => {
      socket.off("notification:new", handleNotification);
      window.removeEventListener("notifications:changed", handleNotificationsChanged);
    };
  }, [user?._id]);

  const navLinks = [
    { name: "Home", path: "/", icon: Home },
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Community", path: "/community", icon: Users },
    { name: "Help Center", path: "/requests", icon: List },
    { name: "Matching", path: "/matching", icon: Map },
    { name: "Resources", path: "/resources", icon: Box },
    { name: "Safe Status", path: "/safe-status", icon: Shield },
    { name: "Alerts", path: "/weather-alerts", icon: AlertTriangle },
    { name: "Crisis Center", path: "/crisis-center", icon: Radio },
  ];

  const taskLinks = [
    { name: "Post Task", path: "/tasks/new", icon: Plus },
    { name: "My Tasks", path: "/tasks/mine", icon: List },
  ];

  const isActive = (path) => location.pathname === path;

  const userName = user?.name || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* TOP BAR */}
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-gray-800">
              HyperLocal
            </span>
          </Link>

          {/* RIGHT SIDE */}
          <div className="hidden md:flex items-center gap-3">

            {/* Notifications */}
            {user && (
              <Link
                to="/notifications"
                className="relative p-2 rounded-full hover:bg-gray-100"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs px-1.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* User */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="h-8 w-8 rounded-full bg-blue-500 text-white"
                >
                  {userInitial}
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg border rounded-md">
                    <div className="px-4 py-2 border-b">
                      <p className="font-medium">{userName}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>

                    <Link
                      to="/profile"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setShowDropdown(false)}
                    >
                      Profile
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register" className="bg-blue-600 text-white px-3 py-1 rounded">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* MOBILE BUTTON */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* NAV LINKS */}
        {user && (
          <div className="hidden md:flex justify-between py-2">

            <div className="flex gap-2 flex-wrap">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-md flex items-center gap-2 ${
                    isActive(link.path)
                      ? "bg-blue-100 text-blue-700"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.name}
                </Link>
              ))}
            </div>

            {/* TASK MENU */}
            <div className="relative">
              <button
                onClick={() => setTaskMenuOpen(!taskMenuOpen)}
                className="px-3 py-2 flex items-center gap-2 hover:bg-gray-100 rounded-md"
              >
                <Plus className="h-4 w-4" />
                Tasks
              </button>

              {taskMenuOpen && (
                <div className="absolute right-0 mt-2 bg-white shadow-lg border rounded-md w-40">
                  {taskLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setTaskMenuOpen(false)}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MOBILE MENU */}
      {isOpen && (
        <div className="md:hidden border-t px-3 py-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className="block py-2"
            >
              {link.name}
            </Link>
          ))}

          {user && (
            <>
              <div className="border-t mt-2 pt-2">
                {taskLinks.map((link) => (
                  <Link key={link.path} to={link.path} className="block py-2">
                    {link.name}
                  </Link>
                ))}
              </div>

              <Link to="/profile" className="block py-2">Profile</Link>
              <button onClick={handleLogout} className="block py-2 text-red-600">
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
