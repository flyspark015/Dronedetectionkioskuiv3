/**
 * Touch-First Design System Demonstration
 * 
 * This component showcases all touch-optimized UI components
 * designed for Android tablets, Raspberry Pi kiosks, and touch monitors
 */

import { useState } from 'react';
import { Button, IconButton, Chip } from './ui/Button';
import { TouchContactCard, CompactContactCard } from './ui/TouchContactCard';
import { SimpleBottomSheet, TabbedBottomSheet } from './ui/TouchBottomSheet';
import { 
  Play, 
  Square, 
  Volume2, 
  VolumeX, 
  MapPin, 
  Radio, 
  AlertCircle,
  Settings,
  Download,
  Trash2
} from 'lucide-react';
import type { Contact } from '@/app/types/contacts';

export function TouchDemo() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTabbedSheetOpen, setIsTabbedSheetOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedChip, setSelectedChip] = useState('all');

  // Mock contacts
  const mockContacts: Contact[] = [
    {
      id: 'rid-1',
      type: 'remote-id',
      severity: 'critical',
      lastSeen: new Date(Date.now() - 30000),
      model: 'DJI Mavic 3',
      serialId: 'DJI-M3-78A4B2',
      droneCoords: { lat: 37.7749, lng: -122.4194, alt: 120 },
      distance: 245,
      bearing: 142,
      isPinned: true,
      tags: ['priority', 'commercial']
    },
    {
      id: 'fpv-1',
      type: 'fpv',
      severity: 'high',
      lastSeen: new Date(Date.now() - 15000),
      band: '5.8GHz',
      frequency: 5860,
      rssi: -68,
      lockState: 'locked',
      threshold: 'Balanced',
      hitCount: 142
    }
  ];

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Overview Tab</h3>
          <p className="text-slate-400">Contact details would go here</p>
        </div>
      )
    },
    {
      id: 'data',
      label: 'Data',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Data Tab</h3>
          <p className="text-slate-400">Raw JSON data would go here</p>
        </div>
      )
    },
    {
      id: 'actions',
      label: 'Actions',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Actions Tab</h3>
          <p className="text-slate-400">Quick actions would go here</p>
        </div>
      )
    }
  ];

  return (
    <div className="h-screen bg-slate-950 text-slate-100 overflow-y-auto p-6 space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Touch-First Design System</h1>
        <p className="text-slate-400">
          Optimized for Android tablets, kiosks, and touch monitors
        </p>
        <p className="text-xs text-slate-500">
          Minimum 48px touch targets • Android-style feedback • Shape hierarchy
        </p>
      </div>

      {/* Section: Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-slate-700">
          Buttons (Rounded Rectangles, NOT Circles)
        </h2>
        
        <div className="space-y-3">
          <div>
            <p className="text-sm text-slate-400 mb-2">Primary (56px height)</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="large" leftIcon={<Play className="w-5 h-5" />}>
                Start Scan
              </Button>
              <Button variant="primary" size="large" isLoading>
                Loading...
              </Button>
              <Button variant="primary" size="large" disabled>
                Disabled
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-2">Secondary (48px height)</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" size="medium" leftIcon={<Download className="w-4 h-4" />}>
                Export
              </Button>
              <Button variant="secondary" size="medium">
                Cancel
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-2">Ghost</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" size="medium" leftIcon={<Settings className="w-4 h-4" />}>
                Settings
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-2">Destructive</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="destructive" size="large" leftIcon={<Square className="w-5 h-5" />}>
                Stop Scan
              </Button>
              <Button variant="destructive" size="medium" leftIcon={<Trash2 className="w-4 h-4" />}>
                Delete
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-2">Full Width</p>
            <Button variant="primary" size="large" fullWidth>
              Full Width Button
            </Button>
          </div>
        </div>
      </section>

      {/* Section: Icon Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-slate-700">
          Icon Buttons (Rounded Squares, 48px × 48px)
        </h2>
        
        <div className="flex flex-wrap gap-3">
          <IconButton
            icon={isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            label={isMuted ? 'Unmute' : 'Mute'}
            onClick={() => setIsMuted(!isMuted)}
          />
          <IconButton
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
          />
          <IconButton
            icon={<Trash2 className="w-5 h-5" />}
            label="Delete"
            variant="destructive"
          />
          <IconButton
            icon={<MapPin className="w-5 h-5" />}
            label="Location"
            size="large"
          />
        </div>
      </section>

      {/* Section: Chips */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-slate-700">
          Chips (Pills for Filters, 40px height)
        </h2>
        
        <div className="flex flex-wrap gap-2">
          <Chip
            label="All"
            count={12}
            isSelected={selectedChip === 'all'}
            onClick={() => setSelectedChip('all')}
          />
          <Chip
            label="Remote ID"
            count={5}
            leftIcon={<MapPin className="w-4 h-4" />}
            isSelected={selectedChip === 'rid'}
            onClick={() => setSelectedChip('rid')}
          />
          <Chip
            label="FPV"
            count={4}
            leftIcon={<Radio className="w-4 h-4" />}
            isSelected={selectedChip === 'fpv'}
            onClick={() => setSelectedChip('fpv')}
          />
          <Chip
            label="Unknown"
            count={3}
            leftIcon={<AlertCircle className="w-4 h-4" />}
            isSelected={selectedChip === 'unknown'}
            onClick={() => setSelectedChip('unknown')}
          />
          <Chip
            label="Pinned"
            isSelected={selectedChip === 'pinned'}
            onClick={() => setSelectedChip('pinned')}
          />
        </div>
      </section>

      {/* Section: Contact Cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-slate-700">
          Contact Cards (Minimum 80px, Entire Card Tappable)
        </h2>
        
        <div className="space-y-3">
          {mockContacts.map((contact) => (
            <TouchContactCard
              key={contact.id}
              contact={contact}
              onClick={(c) => console.log('Clicked:', c.id)}
            />
          ))}
        </div>

        <div className="mt-6">
          <p className="text-sm text-slate-400 mb-2">Compact Variant (64px)</p>
          <div className="space-y-2">
            {mockContacts.map((contact) => (
              <CompactContactCard
                key={contact.id}
                contact={contact}
                onClick={(c) => console.log('Clicked:', c.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section: Bottom Sheets */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-slate-700">
          Bottom Sheets (Android-Native Feel)
        </h2>
        
        <div className="space-y-3">
          <Button
            variant="primary"
            size="large"
            onClick={() => setIsSheetOpen(true)}
          >
            Open Simple Bottom Sheet
          </Button>

          <Button
            variant="secondary"
            size="large"
            onClick={() => setIsTabbedSheetOpen(true)}
          >
            Open Tabbed Bottom Sheet
          </Button>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold">Bottom Sheet Features:</p>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>✓ Large drag handle (48px wide)</li>
            <li>✓ Swipe up/down gestures</li>
            <li>✓ Tap backdrop to dismiss</li>
            <li>✓ Smooth spring animations</li>
            <li>✓ Never blocks bottom navigation</li>
          </ul>
        </div>
      </section>

      {/* Section: Touch Feedback */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-slate-700">
          Touch Feedback Principles
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-green-400">✓ DO</h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Minimum 48px × 48px touch targets</li>
              <li>• 56px height for primary actions</li>
              <li>• Android-style ripple effects</li>
              <li>• Press state (scale 0.97)</li>
              <li>• Clear visual feedback</li>
              <li>• 8-12px spacing between targets</li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-red-500">✗ DON'T</h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Tiny icons as buttons (&lt;48px)</li>
              <li>• Circular buttons everywhere</li>
              <li>• Rely on hover states</li>
              <li>• Stack animations</li>
              <li>• Use heavy blur/glow</li>
              <li>• Mix touch + mouse patterns</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section: Responsive Behavior */}
      <section className="space-y-4 mb-12">
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-slate-700">
          Responsive Behavior
        </h2>
        
        <div className="bg-slate-800 rounded-lg p-4 space-y-3">
          <div>
            <p className="font-semibold mb-1">Portrait (≤800px)</p>
            <p className="text-sm text-slate-400">
              Stacked layouts, larger touch targets, single column
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">Landscape (801-1280px)</p>
            <p className="text-sm text-slate-400">
              Side-by-side panels, map + list view
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">Desktop (>1280px)</p>
            <p className="text-sm text-slate-400">
              Multi-column grids, generous spacing
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Sheets */}
      <SimpleBottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Simple Bottom Sheet"
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            This is a simple bottom sheet with swipe-to-dismiss gesture.
          </p>
          <p className="text-sm text-slate-400">
            Try swiping down from the drag handle to dismiss.
          </p>
          <Button variant="primary" size="large" fullWidth onClick={() => setIsSheetOpen(false)}>
            Close
          </Button>
        </div>
      </SimpleBottomSheet>

      <TabbedBottomSheet
        isOpen={isTabbedSheetOpen}
        onClose={() => setIsTabbedSheetOpen(false)}
        tabs={tabs}
        title="Contact Details"
      />
    </div>
  );
}