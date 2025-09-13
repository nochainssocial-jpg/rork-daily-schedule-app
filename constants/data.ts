import { Staff, Participant, Chore, ChecklistItem, TimeSlot } from '@/types/schedule';

export const STAFF_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
  '#A3E4D7', '#F9E79F', '#D5A6BD', '#AED6F1', '#A9DFBF',
  '#F5B7B1', '#D2B4DE', '#A9CCE3', '#A3E4D7', '#F7DC6F',
  '#E8DAEF', '#D1F2EB'
];

export const DEFAULT_STAFF: Staff[] = [
  { id: '1', name: 'Anita', color: STAFF_COLORS[0] },
  { id: '2', name: 'Antoinette', color: STAFF_COLORS[1], isTeamLeader: true },
  { id: '3', name: 'Antonia', color: STAFF_COLORS[2] },
  { id: '4', name: 'Benoit', color: STAFF_COLORS[3] },
  { id: '5', name: 'Charbel', color: STAFF_COLORS[4] },
  { id: '6', name: 'Chelsea', color: STAFF_COLORS[5] },
  { id: '7', name: 'Crystal', color: STAFF_COLORS[6] },
  { id: '8', name: 'George', color: STAFF_COLORS[7] },
  { id: '9', name: 'Isabella', color: STAFF_COLORS[8] },
  { id: '10', name: 'Jamie', color: STAFF_COLORS[9] },
  { id: '11', name: 'Jessica', color: STAFF_COLORS[10] },
  { id: '12', name: 'Juliet', color: STAFF_COLORS[11] },
  { id: '13', name: 'Liana', color: STAFF_COLORS[12] },
  { id: '14', name: 'Liya', color: STAFF_COLORS[13] },
  { id: '15', name: 'Maray', color: STAFF_COLORS[14] },
  { id: '16', name: 'Marianne', color: STAFF_COLORS[15] },
  { id: '17', name: 'Mary', color: STAFF_COLORS[16] },
  { id: '18', name: 'Michelle', color: STAFF_COLORS[17] },
  { id: '19', name: 'Mikaela', color: STAFF_COLORS[18] },
  { id: '20', name: 'Paneta', color: STAFF_COLORS[19] },
  { id: '21', name: 'Princess', color: STAFF_COLORS[20] },
  { id: '22', name: 'Tayla', color: STAFF_COLORS[21] },
  { id: '23', name: 'Tema', color: STAFF_COLORS[22] },
  { id: '24', name: 'Theresia', color: STAFF_COLORS[23] },
  { id: '25', name: 'Everyone', color: STAFF_COLORS[24] },
  { id: '26', name: 'Drive/Outing', color: STAFF_COLORS[25] },
  { id: '27', name: 'Audit', color: STAFF_COLORS[26] }
];

export const DEFAULT_PARTICIPANTS: Participant[] = [
  { id: '1', name: 'Ayaz' },
  { id: '2', name: 'Billy' },
  { id: '3', name: 'Billy - drop to Melina\'s', hasDropOff: true, dropOffLocation: 'Melina\'s' },
  { id: '4', name: 'Brian' },
  { id: '5', name: 'Diana' },
  { id: '6', name: 'Elias' },
  { id: '7', name: 'Gemana' },
  { id: '8', name: 'Jacob' },
  { id: '9', name: 'Jimmy' },
  { id: '10', name: 'Jessica' },
  { id: '11', name: 'Julian' },
  { id: '12', name: 'Maher' },
  { id: '13', name: 'Naveed' },
  { id: '14', name: 'Paul' },
  { id: '15', name: 'Peter' },
  { id: '16', name: 'Reema' },
  { id: '17', name: 'Reema - Mancini\'s', hasDropOff: true, dropOffLocation: 'Mancini\'s' },
  { id: '18', name: 'Saim' },
  { id: '19', name: 'Scott' },
  { id: '20', name: 'Shatha' },
  { id: '21', name: 'Sumera' },
  { id: '22', name: 'Tiffany' },
  { id: '23', name: 'Zara' },
  { id: '24', name: 'Zoya' },
  { id: '25', name: 'Tema' },
  { id: '26', name: 'Tema - Drop to Ayaz', hasDropOff: true, dropOffLocation: 'Ayaz' }
];

export const DEFAULT_CHORES: Chore[] = [
  { id: '1', name: 'Vacuuming' },
  { id: '2', name: 'Mopping' },
  { id: '3', name: 'Clean toilets, Refill Soap Dispenser, Restock Toilet Paper' },
  { id: '4', name: 'Tidy up and Pack Twins Room' },
  { id: '5', name: 'Wipe down TV, Clean front Windows inside and outside, Wipe down Piano and table in lounge area' },
  { id: '6', name: 'Wipe Down Lounges with Soapy Water' },
  { id: '7', name: 'Wipe down door handles and light switches' },
  { id: '8', name: 'Wipe Down Kitchen Cupboards' },
  { id: '9', name: 'Pack sun bed mattresses & covers in gym area' },
  { id: '10', name: 'Tidy front and back of property with blower' },
  { id: '11', name: 'Weeding of garden beds' }
];

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', name: 'Pack all outdoor cushions and covers in the shed & close roller door' },
  { id: '2', name: 'Lock the screen door & back door' },
  { id: '3', name: 'Place all devices, computers & walkie talkies on charge' },
  { id: '4', name: 'Turn off all lights and air conditioners' },
  { id: '5', name: 'Turn on the alarm' },
  { id: '6', name: 'Lock the front door and screen door' }
];

export const TIME_SLOTS: TimeSlot[] = [
  { id: '1', startTime: '10:00', endTime: '10:30', displayTime: '10:00am - 10:30am' },
  { id: '2', startTime: '10:30', endTime: '11:00', displayTime: '10:30am - 11:00am' },
  { id: '3', startTime: '11:00', endTime: '11:30', displayTime: '11:00am - 11:30am' },
  { id: '4', startTime: '11:30', endTime: '12:00', displayTime: '11:30am - 12:00pm' },
  { id: '5', startTime: '12:00', endTime: '12:30', displayTime: '12:00pm - 12:30pm' },
  { id: '6', startTime: '12:30', endTime: '13:00', displayTime: '12:30pm - 1:00pm' },
  { id: '7', startTime: '13:00', endTime: '13:30', displayTime: '1:00pm - 1:30pm' },
  { id: '8', startTime: '13:30', endTime: '14:00', displayTime: '1:30pm - 2:00pm' },
  { id: '9', startTime: '14:00', endTime: '14:30', displayTime: '2:00pm - 2:30pm' }
];