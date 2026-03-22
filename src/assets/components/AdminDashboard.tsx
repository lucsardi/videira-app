import { useState } from "react";
import { motion } from "framer-motion";
import { auth, db } from "../../../firebase";
import { doc, setDoc } from "firebase/firestore";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  const generateInvite = async () => {
    setLoading(true);
    try {
      const inviteId = crypto.randomUUID();

      await setDoc(doc(db, "invites", inviteId), {
        createdBy: auth.currentUser?.uid,
        createdAt: new Date(),
        used: false,
      });

      setInviteLink(`${window.location.origin}/register/${inviteId}`);
    } catch (err) {
      console.error("Erro ao gerar convite:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-pastel w-full max-w-md p-8"
    >
      <h2 className="text-xl font-bold mb-4">Painel do Admin</h2>

      <button
        onClick={generateInvite}
        disabled={loading}
        className="w-full bg-brand-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 disabled:opacity-50 transition-colors"
      >
        {loading ? "Gerando convite..." : "Gerar Convite"}
      </button>

      {inviteLink && (
        <div className="mt-4 p-2 bg-green-100 text-green-700 rounded-lg text-sm">
          Convite gerado: <br />
          <a href={inviteLink} className="underline">{inviteLink}</a>
        </div>
      )}
    </motion.div>
  );
};

export default AdminDashboard;