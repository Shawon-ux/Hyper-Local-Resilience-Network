import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from "react";
import api from "../services/api";
import { io } from "socket.io-client";
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
  ChevronDown,
  CheckCircle,
  Trophy
} from "lucide-react";

let socket;

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [taskMenuOpen, setTaskMenuOpen] = useState(false);
  const [safetyMenuOpen, setSafetyMenuOpen] = useState(false);
  const [resourceMenuOpen, setResourceMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    setShowDropdown(false);
  };

  const fetchUnreadNotifications = async () => {
    try {
      const { data } = await api.get('/notifications/my');
      setUnreadCount(data.filter((item) => !item.isRead).length);
    } catch (err) {
      console.error('Failed to load notification count:', err);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadNotifications();
      
      socket = io("http://localhost:5000");
      socket.emit("register", user._id);
      
      socket.on("notification", (notification) => {
        setUnreadCount((prev) => prev + 1);
        window.dispatchEvent(new Event('taskUpdated'));
      });

      const handleNotificationRead = () => {
        fetchUnreadNotifications();
      };
      window.addEventListener("notificationsRead", handleNotificationRead);

      return () => {
        socket.disconnect();
        window.removeEventListener("notificationsRead", handleNotificationRead);
      };
    } else {
      setUnreadCount(0);
    }
  }, [user]);

  const mainLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Community', path: '/community', icon: Users },
  ];

  const safetyLinks = [
    { name: 'Safe Status', path: '/safe-status', icon: Shield },
    { name: 'Weather Alerts', path: '/weather-alerts', icon: AlertTriangle },
  ];

  const resourceLinks = [
    { name: "Help Center", path: "/requests", icon: List },
    { name: "Matching", path: "/matching", icon: Map },
    { name: "Resource Board", path: "/resources", icon: Box },
  ];

  const taskLinks = [
    { name: "Available Tasks", path: "/tasks/available", icon: Users },
    { name: "Post Task", path: "/tasks/new", icon: Plus },
    { name: "My Tasks", path: "/tasks/mine", icon: List },
    { name: "Completed Tasks", path: "/tasks/completed", icon: CheckCircle },
  ];

  const isActive = (path) => location.pathname === path;

  const userName = user?.name || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  const closeAllMenus = () => {
    setTaskMenuOpen(false);
    setSafetyMenuOpen(false);
    setResourceMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <Shield className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-800">
                  HyperLocal
                </span>
              </Link>
            </div>

            {/* User section */}
            <div className="hidden md:flex md:items-center md:gap-3">
              {user && (
                <Link
                  to="/notifications"
                  className="relative inline-flex items-center rounded-full p-2 text-gray-600 hover:bg-gray-100"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {user ? (
                <div className="relative ml-3">
                  <button
                    onClick={() => {
                      closeAllMenus();
                      setShowDropdown(!showDropdown);
                    }}
                    className="flex rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {userInitial}
                    </div>
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                      <div className="px-4 py-2 text-sm border-b">
                        <p className="font-medium">{userName}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
 
                      <Link
                        to={`/reputation/${user._id}`}
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center px-4 py-2 text-sm hover:bg-gray-100 text-blue-600 font-medium"
                      >
                        <Trophy className="mr-2 h-4 w-4" />
                        Reputation Profile
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Link
                    to="/login"
                    className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:flex md:flex-wrap md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {user &&
                mainLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${
                      isActive(link.path)
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.name}
                  </Link>
                ))}
            </div>

            {user && (
              <div className="flex items-center gap-2">
                {/* Safety Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setSafetyMenuOpen(!safetyMenuOpen);
                      setResourceMenuOpen(false);
                      setTaskMenuOpen(false);
                      setShowDropdown(false);
                    }}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition inline-flex items-center gap-2 ${
                      safetyMenuOpen ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    Safety
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {safetyMenuOpen && (
                    <div className="absolute left-0 mt-2 w-48 rounded-3xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 z-50">
                      {safetyLinks.map((link) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setSafetyMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <link.icon className="h-4 w-4" />
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resources Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setResourceMenuOpen(!resourceMenuOpen);
                      setSafetyMenuOpen(false);
                      setTaskMenuOpen(false);
                      setShowDropdown(false);
                    }}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition inline-flex items-center gap-2 ${
                      resourceMenuOpen ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Box className="h-4 w-4" />
                    Resources
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {resourceMenuOpen && (
                    <div className="absolute left-0 mt-2 w-48 rounded-3xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 z-50">
                      {resourceLinks.map((link) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setResourceMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <link.icon className="h-4 w-4" />
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tasks Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setTaskMenuOpen(!taskMenuOpen);
                      setSafetyMenuOpen(false);
                      setResourceMenuOpen(false);
                      setShowDropdown(false);
                    }}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition inline-flex items-center gap-2 ${
                      taskMenuOpen ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    Tasks
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {taskMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-3xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 z-50">
                      {taskLinks.map((link) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setTaskMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <link.icon className="h-4 w-4" />
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      {/* Mobile button */}
      <div className="flex md:hidden items-center absolute right-4 top-4">
        <button onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-6 w-6 text-slate-600" /> : <Menu className="h-6 w-6 text-slate-600" />}
        </button>
      </div>
    </div>
      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {user &&
              mainLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium
                  ${
                    isActive(link.path)
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                `}
                >
                  {link.name}
                </Link>
              ))}

            {user && (
              <>
                <div className="border-t border-slate-200 pt-3">
                  <p className="px-3 pb-2 text-xs uppercase tracking-wide text-slate-500">
                    Safety & Alerts
                  </p>
                  {safetyLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <p className="px-3 pb-2 text-xs uppercase tracking-wide text-slate-500">
                    Resources
                  </p>
                  {resourceLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <p className="px-3 pb-2 text-xs uppercase tracking-wide text-slate-500">
                    Tasks
                  </p>
                  {taskLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </>
            )}

            {user ? (
              <div className="border-t border-slate-200 pt-3">
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Profile
                </Link>
                <Link
                  to={`/reputation/${user._id}`}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 text-blue-600 font-medium hover:bg-gray-100 rounded-md"
                >
                  Reputation Profile
                </Link>
                <Link
                  to="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md flex items-center justify-between"
                >
                  Notifications
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-red-600 hover:bg-gray-100 rounded-md"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-3 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-3 py-2 bg-blue-600 text-white rounded-md"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
