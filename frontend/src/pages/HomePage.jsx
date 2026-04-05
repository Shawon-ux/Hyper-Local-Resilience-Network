import { useAuth } from '../context/AuthContext';
import { Shield, Users, Clock, Award } from 'lucide-react';


const HomePage = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: Shield,
      title: 'Hyperlocal Resilience',
      description: 'Connect with neighbors in your immediate area for everyday help and emergency support.',
    },
    {
      icon: Users,
      title: 'Skill-Based Matching',
      description: 'Find volunteers with the right skills for your micro-tasks or urgent needs.',
    },
    {
      icon: Clock,
      title: 'Real-Time Alerts',
      description: 'Get instant notifications for local crises and community announcements.',
    },
    {
      icon: Award,
      title: 'Reputation System',
      description: 'Build trust through verified completions and community endorsements.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Your Community,</span>
              <span className="block text-blue-600">Stronger Together</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              A hyperlocal resilience network connecting neighbors to share resources, skills, and support — before, during, and after emergencies.
            </p>
            {!user && (
              <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                <div className="rounded-md shadow">
                  <a
                    href="/register"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                  >
                    Get Started
                  </a>
                </div>
                <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                  <a
                    href="/login"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                  >
                    Sign In
                  </a>
                </div>
              </div>
            )}
            {user && (
              <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                <div className="rounded-md shadow">
                  <a
                    href="/dashboard"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                  >
                    Go to Dashboard
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to build a resilient community
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              {features.map((feature, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="ml-16">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{feature.title}</h3>
                    <p className="mt-2 text-base text-gray-500">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Welcome message for logged-in users */}
      {user && (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-50 rounded-lg p-6">
            <p className="text-blue-800 text-center">
              Welcome back, <strong>{user.name}</strong>! Your reputation score: {user.reputationScore || 0}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;