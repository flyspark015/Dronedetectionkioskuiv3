import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { Contact } from '@/app/types/contacts';
import { isRemoteIdContact, isFpvLinkContact, isUnknownRfContact, getDisplayFrequencyMHz, isContactLost, isContactStale } from '@/app/types/contacts';
import { sortContacts, type SortMode } from '@/app/utils/contact-sorting';
import { Chip } from '@/app/components/Chip';
import { ContactCard } from '@/app/components/ContactCard';
import { SortToggle } from '@/app/components/SortToggle';

interface ContactsDrawerContentProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
  snapState: 'collapsed' | 'mid' | 'expanded';
  onScrolling?: (isScrolling: boolean) => void;
  gpsFixQuality?: number;
}

export function ContactsDrawerContent({ 
  contacts, 
  onContactClick, 
  snapState,
  onScrolling,
  gpsFixQuality = 0
}: ContactsDrawerContentProps) {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('severity');
  const [hideLost, setHideLost] = useState(true); // Default ON
  const [hideStale, setHideStale] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_DISPLAYED_CONTACTS = 50;

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'REMOTE_ID', label: 'Remote ID' },
    { id: 'FPV_LINK', label: 'FPV Video' },
    { id: 'UNKNOWN_RF', label: 'Unknown' },
    { id: 'pinned', label: 'Pinned' },
    { id: 'tagged', label: 'Tagged' },
  ];

  // Handle scroll to notify parent
  useEffect(() => {
    const handleScroll = () => {
      onScrolling?.(true);

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set new timeout to indicate scrolling stopped
      scrollTimeoutRef.current = setTimeout(() => {
        onScrolling?.(false);
      }, 1500);
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => {
        scrollElement.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [onScrolling]);

  const filteredContacts = contacts.filter(contact => {
    // Filter out LOST contacts if enabled
    if (hideLost && isContactLost(contact)) return false;
    
    // Filter out STALE contacts if enabled
    if (hideStale && isContactStale(contact)) return false;
    
    // Filter by type
    if (activeFilter !== 'all') {
      if (activeFilter === 'pinned' && !contact.isPinned) return false;
      if (activeFilter === 'tagged' && (!contact.tags || contact.tags.length === 0)) return false;
      if (['REMOTE_ID', 'FPV_LINK', 'UNKNOWN_RF'].includes(activeFilter) && contact.type !== activeFilter) return false;
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (isRemoteIdContact(contact)) {
        return contact.remote_id?.model?.toLowerCase().includes(query) || 
               contact.remote_id?.serial_id?.toLowerCase().includes(query);
      }
      if (isFpvLinkContact(contact)) {
        return contact.fpv_link.band?.toLowerCase().includes(query) ||
               getDisplayFrequencyMHz(contact.fpv_link.freq_hz).toString().includes(query);
      }
      if (isUnknownRfContact(contact)) {
        return contact.unknown_rf?.notes?.toLowerCase().includes(query);
      }
    }

    return true;
  });

  // Sort contacts based on the selected sort mode
  const sortedContacts = sortContacts(filteredContacts, sortMode, gpsFixQuality);
  
  // Limit to top 50 contacts
  const limitedContacts = sortedContacts.slice(0, MAX_DISPLAYED_CONTACTS);
  const hiddenCount = sortedContacts.length - MAX_DISPLAYED_CONTACTS;

  // Find nearest Remote ID contact
  const remoteIdContacts = contacts.filter(c => isRemoteIdContact(c) && c.distance_m !== undefined);
  const nearestContact = remoteIdContacts.length > 0 
    ? remoteIdContacts.reduce((nearest, current) => 
        ((current as any).distance_m ?? Infinity) < ((nearest as any).distance_m ?? Infinity) ? current : nearest
      )
    : null;

  // Show only top 2 contacts when collapsed
  const displayContacts = snapState === 'collapsed' 
    ? limitedContacts.slice(0, 2) 
    : limitedContacts;

  // Sticky header for expanded view
  const showStickyHeader = snapState === 'expanded';

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Controls - sticky when expanded */}
      {snapState !== 'collapsed' && (
        <div className={`bg-slate-900 border-b border-slate-800 p-4 space-y-3 flex-shrink-0 ${
          showStickyHeader ? 'sticky top-0 z-10' : ''
        }`}>
          {/* Filter chips - horizontal scroll */}
          <div className="chips-scroll pb-1">
            {filters.map(filter => (
              <Chip
                key={filter.id}
                label={filter.label}
                active={activeFilter === filter.id}
                onClick={() => setActiveFilter(filter.id)}
              />
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 text-slate-100 pl-12 pr-12 py-3 rounded-2xl text-[16px] border border-slate-700 focus:outline-none focus:border-blue-500 min-h-[48px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Sort toggle */}
          <SortToggle
            mode={sortMode}
            onModeChange={setSortMode}
          />
          
          {/* Hide toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHideLost(!hideLost)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
                hideLost 
                  ? 'bg-slate-700 text-slate-200 border-slate-600' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <span>{hideLost ? '✓' : '○'}</span>
              <span>Hide LOST</span>
            </button>
            <button
              onClick={() => setHideStale(!hideStale)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
                hideStale 
                  ? 'bg-slate-700 text-slate-200 border-slate-600' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <span>{hideStale ? '✓' : '○'}</span>
              <span>Hide STALE</span>
            </button>
          </div>
        </div>
      )}

      {/* Contacts List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-panel p-4 space-y-3 pb-28"
      >
        {snapState === 'collapsed' && displayContacts.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-[14px]">
            No active contacts
          </div>
        )}

        {displayContacts.length === 0 && snapState !== 'collapsed' ? (
          <div className="text-center py-12 text-slate-400">
            No contacts found
          </div>
        ) : (
          displayContacts.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onClick={() => onContactClick(contact)}
              isNearest={nearestContact?.id === contact.id}
            />
          ))
        )}

        {/* Show hint in collapsed state */}
        {snapState === 'collapsed' && sortedContacts.length > 2 && (
          <div className="text-center py-4 text-slate-500 text-[12px]">
            +{sortedContacts.length - 2} more contacts
          </div>
        )}
        
        {/* Show hidden count in expanded state */}
        {snapState !== 'collapsed' && hiddenCount > 0 && (
          <div className="text-center py-4 text-slate-500 text-[12px]">
            +{hiddenCount} more contacts
          </div>
        )}
      </div>
    </div>
  );
}
