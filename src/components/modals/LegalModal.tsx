import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy' | 'refund' | null;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen || !type) return null;

  const content = {
    terms: {
      title: 'Terms of Service',
      text: (
        <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
          <p>Welcome to Unity. By purchasing a Unit, you acquire the right to display an image and a link on the designated grid coordinates.</p>
          <p><strong className="text-white">Age Requirement:</strong> You must be at least 18 years old to use this service and purchase Units.</p>
          <p><strong className="text-white">Content & Copyright:</strong> You are solely responsible for the content you upload. You must own the rights to the images you post. By uploading, you grant Unity a non-exclusive license to display your content on the grid. We strictly prohibit illegal, offensive, or NSFW content. Administrators reserve the right to clear your Unit or confiscate it without a refund if these rules are violated.</p>
          <p><strong className="text-white">No Investment Guarantee:</strong> Units are digital art and social experiments, not financial instruments. We make no guarantees regarding the future resale value of any Unit.</p>
          <p><strong className="text-white">Service "As Is":</strong> Unity is provided on an "as is" and "as available" basis. We do not guarantee uninterrupted access to the site and are not liable for any server downtimes or data loss.</p>
          <p><strong className="text-white">Charity:</strong> 10% of all platform fees are dedicated to charitable causes, distributed at the discretion of the Unity team.</p>
        </div>
      )
    },
    privacy: {
      title: 'Privacy Policy',
      text: (
        <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
          <p>At Unity, we respect your privacy. We collect minimal personal information necessary to operate the service, including your username, email (if provided), and public wallet addresses.</p>
          <p>We also store the images and links you upload to your owned Units.</p>
          <p>We do not sell your personal data to third parties. By using Unity, you consent to the collection and use of this information to manage your digital assets.</p>
        </div>
      )
    },
    refund: {
      title: 'Refund Policy',
      text: (
        <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
          <p>Due to the irreversible nature of cryptocurrency transactions and the digital nature of the assets (Grid Units) sold on Unity, <strong className="text-[#FF5733]">all sales are final</strong>.</p>
          <p>We do not offer refunds, returns, or exchanges once a transaction has been confirmed on the blockchain.</p>
          <p>Please ensure you verify all details before completing your purchase.</p>
        </div>
      )
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          className="bg-[#0a0a0a] border border-[#262626] rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col relative overflow-hidden"
        >
          <div className="p-6 border-b border-[#262626] flex items-center justify-between">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">{content[type].title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-[#262626] rounded-xl transition-colors text-gray-500 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto custom-scrollbar">
            {content[type].text}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};