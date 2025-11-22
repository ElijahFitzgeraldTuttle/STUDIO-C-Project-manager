import { useUser } from "@/contexts/UserContext";
import { User } from "lucide-react";
import { motion } from "framer-motion";

const users = ["Miles", "Eli", "Chase"];

export default function Login() {
  const { setCurrentUser } = useUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading mb-2">Project Flow</h1>
          <p className="text-slate-500">Choose your account to continue</p>
        </div>

        <div className="space-y-3">
          {users.map((user, index) => (
            <motion.button
              key={user}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setCurrentUser(user)}
              className="w-full bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4 hover:shadow-lg hover:border-indigo-200 hover:bg-indigo-50/30 transition-all duration-200 group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {user.charAt(0)}
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{user}</div>
                <div className="text-sm text-slate-500">Team Member</div>
              </div>
              <User className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </motion.button>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          Select your name to access your projects
        </p>
      </motion.div>
    </div>
  );
}
