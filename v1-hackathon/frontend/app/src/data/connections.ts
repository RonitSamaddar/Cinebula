/**
 * Show connection pairs — links between related shows across categories.
 * Each pair is [showId1, showId2]. Will be replaced by backend data.
 */

import type { Connection } from "@/types";

export const CONNECTIONS: Connection[] = [
  // Drama ↔ Thriller
  ["drama-0", "thriller-0"],   // Breaking Bad ↔ Mindhunter
  ["drama-1", "thriller-4"],   // The Crown ↔ True Detective
  ["drama-3", "thriller-8"],   // Better Call Saul ↔ Mr. Robot
  ["drama-7", "thriller-9"],   // The Sopranos ↔ Dexter
  ["drama-5", "thriller-2"],   // Mad Men ↔ Homeland

  // Drama ↔ Crime
  ["drama-0", "crime-0"],      // Breaking Bad ↔ Narcos
  ["drama-4", "crime-4"],      // The Wire ↔ The Blacklist
  ["drama-7", "crime-1"],      // The Sopranos ↔ Fargo
  ["drama-6", "crime-14"],     // Ozark ↔ Snowfall
  ["drama-11", "crime-3"],     // House of Cards ↔ Line of Duty

  // Sci-Fi ↔ Thriller
  ["sci-fi-0", "thriller-10"], // Stranger Things ↔ The Night Manager
  ["sci-fi-3", "thriller-8"],  // Westworld ↔ Mr. Robot
  ["sci-fi-5", "thriller-0"],  // Dark ↔ Mindhunter
  ["sci-fi-7", "thriller-11"], // Severance ↔ Sharp Objects
  ["sci-fi-18", "thriller-1"], // The OA ↔ You

  // Sci-Fi ↔ Fantasy
  ["sci-fi-6", "fantasy-0"],   // Foundation ↔ Game of Thrones
  ["sci-fi-3", "fantasy-1"],   // Westworld ↔ The Witcher
  ["sci-fi-12", "fantasy-4"],  // Battlestar Galactica ↔ Wheel of Time
  ["sci-fi-2", "fantasy-5"],   // The Expanse ↔ Rings of Power
  ["sci-fi-9", "fantasy-9"],   // Love Death & Robots ↔ The Sandman

  // Comedy ↔ Drama
  ["comedy-0", "drama-10"],    // The Office ↔ Suits
  ["comedy-7", "drama-2"],     // Fleabag ↔ Succession
  ["comedy-4", "drama-5"],     // Arrested Development ↔ Mad Men
  ["comedy-14", "drama-1"],    // Mrs. Maisel ↔ The Crown
  ["comedy-12", "drama-14"],   // Veep ↔ The West Wing

  // Comedy ↔ Romance
  ["comedy-2", "romance-0"],   // Schitt's Creek ↔ Bridgerton
  ["comedy-3", "romance-6"],   // Ted Lasso ↔ Heartstopper
  ["comedy-9", "romance-4"],   // Abbott Elementary ↔ Emily in Paris
  ["comedy-7", "romance-1"],   // Fleabag ↔ Normal People
  ["comedy-18", "romance-9"],  // Only Murders ↔ One Day

  // Action ↔ Thriller
  ["action-3", "thriller-2"],  // Peaky Blinders ↔ Homeland
  ["action-12", "thriller-9"], // The Boys ↔ Dexter
  ["action-8", "thriller-5"],  // The Punisher ↔ Bodyguard
  ["action-18", "thriller-3"], // Jack Ryan ↔ The Americans
  ["action-13", "thriller-0"], // Gangs of London ↔ Mindhunter

  // Action ↔ Crime
  ["action-3", "crime-0"],     // Peaky Blinders ↔ Narcos
  ["action-10", "crime-5"],    // Banshee ↔ Luther
  ["action-4", "crime-12"],    // Vikings ↔ The Night Of
  ["action-19", "crime-15"],   // Fauda ↔ Justified
  ["action-12", "crime-9"],    // The Boys ↔ Money Heist

  // Romance ↔ Drama
  ["romance-0", "drama-1"],    // Bridgerton ↔ The Crown
  ["romance-1", "drama-2"],    // Normal People ↔ Succession
  ["romance-2", "drama-8"],    // Outlander ↔ Downton Abbey
  ["romance-7", "drama-9"],    // Love Actually ↔ This Is Us
  ["romance-14", "drama-17"],  // La La Land ↔ The Leftovers

  // Horror ↔ Thriller
  ["horror-0", "thriller-11"], // Hill House ↔ Sharp Objects
  ["horror-4", "thriller-6"],  // Lovecraft Country ↔ Hannibal
  ["horror-3", "thriller-9"],  // Walking Dead ↔ Dexter
  ["horror-2", "thriller-12"], // Midnight Mass ↔ The Sinner
  ["horror-13", "thriller-4"], // The Terror ↔ True Detective

  // Horror ↔ Sci-Fi
  ["horror-0", "sci-fi-0"],    // Hill House ↔ Stranger Things
  ["horror-4", "sci-fi-1"],    // Lovecraft Country ↔ Black Mirror
  ["horror-7", "sci-fi-5"],    // Marianne ↔ Dark
  ["horror-10", "sci-fi-8"],   // Chernobyl ↔ Devs
  ["horror-15", "sci-fi-18"],  // Archive 81 ↔ The OA

  // Fantasy ↔ Action
  ["fantasy-0", "action-4"],   // Game of Thrones ↔ Vikings
  ["fantasy-14", "action-14"], // House of the Dragon ↔ Shogun
  ["fantasy-1", "action-9"],   // The Witcher ↔ Warrior
  ["fantasy-4", "action-3"],   // Wheel of Time ↔ Peaky Blinders
  ["fantasy-7", "action-6"],   // Merlin ↔ Into the Badlands

  // Crime ↔ Drama
  ["crime-0", "drama-6"],      // Narcos ↔ Ozark
  ["crime-1", "drama-0"],      // Fargo ↔ Breaking Bad
  ["crime-6", "drama-4"],      // Broadchurch ↔ The Wire
  ["crime-9", "drama-11"],     // Money Heist ↔ House of Cards
  ["crime-2", "drama-3"],      // Sherlock ↔ Better Call Saul

  // Cross-genre bridges
  ["comedy-8", "horror-1"],    // What We Do in Shadows ↔ AHS
  ["romance-8", "sci-fi-5"],   // About Time ↔ Dark
  ["fantasy-11", "comedy-6"],  // American Gods ↔ The Good Place
  ["action-1", "sci-fi-6"],    // Mandalorian ↔ Foundation
  ["crime-10", "comedy-18"],   // Lupin ↔ Only Murders
];
