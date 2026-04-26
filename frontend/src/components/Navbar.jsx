import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import api from "../services/api";
import {
  Menu,
  X,
  Home,
  User,
  LogOut,
  Shield,
  LayoutDashboard,
  Users,
  Box,
  Plus,
  List,
  Bell,
  AlertTriangle,
  ChevronDown,
  CheckCircle,
  Trophy,
  Map,
  Radio
} from "lucide-react";

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
  const [socket, setSocket] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    setShowDropdown(false);
    setIsOpen(false);
  };

  const fetchUnreadNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/notifications/my");
      setUnreadCount(data.filter((item) => !item.isRead).length);
    } catch (err) {
      console.error("Notification error:", err);
      setUnreadCount(0);
    }
  };

  // Socket and notifications setup
  useEffect(() => {
    if (!user?._id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setUnreadCount(0);
      return;
    }

    fetchUnreadNotifications();

    // Create socket connection
    const newSocket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      autoConnect: true,
    });
    
    setSocket(newSocket);
    
    newSocket.emit("register:user", user._id);
    newSocket.emit("register", user._id); // Support both naming conventions

    const handleNewNotification = () => {
      setUnreadCount((current) => current + 1);
      window.dispatchEvent(new Event('taskUpdated'));
    };
    
    const handleNotificationsChanged = () => {
      fetchUnreadNotifications();
    };

    newSocket.on("notification:new", handleNewNotification);
    newSocket.on("notification", handleNewNotification);
    window.addEventListener("notifications:changed", handleNotificationsChanged);
    window.addEventListener("notificationsRead", handleNotificationsChanged);

    return () => {
      newSocket.off("notification:new", handleNewNotification);
      newSocket.off("notification", handleNewNotification);
      window.removeEventListener("notifications:changed", handleNotificationsChanged);
      window.removeEventListener("notificationsRead", handleNotificationsChanged);
      newSocket.disconnect();
    };
  }, [user?._id]);

  const closeAllMenus = () => {
    setTaskMenuOpen(false);
    setSafetyMenuOpen(false);
    setResourceMenuOpen(false);
    setShowDropdown(false);
  };

  const isActive = (path) => location.pathname === path;

  const userName = user?.name || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  // Navigation Links
  const mainLinks = [
    { name: "Home", path: "/", icon: Home },
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Community", path: "/community", icon: Users },
  ];

  const safetyLinks = [
    { name: "Safe Status", path: "/safe-status", icon: Shield },
    { name: "Weather Alerts", path: "/weather-alerts", icon: AlertTriangle },
    { name: "Crisis Center", path: "/crisis-center", icon: Radio },
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

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-gray-800">
              HyperLocal
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {user && mainLinks.map((link) => (
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

            {/* Safety Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => {
                    closeAllMenus();
                    setSafetyMenuOpen(!safetyMenuOpen);
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
                  <div className="absolute left-0 mt-2 w-48 rounded-md border border-slate-200 bg-white shadow-lg z-50">
                    {safetyLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setSafetyMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <link.icon className="h-4 w-4" />
                        {link.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Resources Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => {
                    closeAllMenus();
                    setResourceMenuOpen(!resourceMenuOpen);
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
                  <div className="absolute left-0 mt-2 w-48 rounded-md border border-slate-200 bg-white shadow-lg z-50">
                    {resourceLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setResourceMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <link.icon className="h-4 w-4" />
                        {link.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tasks Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => {
                    closeAllMenus();
                    setTaskMenuOpen(!taskMenuOpen);
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
                  <div className="absolute left-0 mt-2 w-48 rounded-md border border-slate-200 bg-white shadow-lg z-50">
                    {taskLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setTaskMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <link.icon className="h-4 w-4" />
                        {link.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

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

            {/* User Dropdown */}
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

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {user && mainLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              >
                {link.name}
              </Link>
            ))}

            {user && (
              <>
                <div className="border-t pt-2 mt-2">
                  <p className="px-3 text-xs font-semibold text-gray-500">SAFETY</p>
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

                <div className="border-t pt-2 mt-2">
                  <p className="px-3 text-xs font-semibold text-gray-500">RESOURCES</p>
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

                <div className="border-t pt-2 mt-2">
                  <p className="px-3 text-xs font-semibold text-gray-500">TASKS</p>
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

                <Link
                  to="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                >
                  Notifications
                  {unreadCount > 0 && (
                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                >
                  Profile
                </Link>

                <Link
                  to={`/reputation/${user._id}`}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:bg-gray-100"
                >
                  Reputation Profile
                </Link>

                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-gray-100"
                >
                  Logout
                </button>
              </>
            )}

            {!user && (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium bg-blue-600 text-white"
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