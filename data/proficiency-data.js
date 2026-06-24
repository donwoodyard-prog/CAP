// ==========================================================================
// MAT Module: Proficiency Profile Data
// ==========================================================================
// Description: Proficiency training profiles for CAP mission pilots
// Dependencies: None
// ==========================================================================

(function() {
  'use strict';
  
  // Create namespace
  window.MAT = window.MAT || {};
  window.MAT.data = window.MAT.data || {};
  
  // Proficiency training profiles based on CAP Form 5 requirements
  const proficiencyProfiles = [
      {
        id: 1,
        name: "Visual Search Mission",
        prereq: "Qualified SAR/DR Mission Pilot",
        maxDuration: "1.5 hrs",
        sections: [
          {
            title: "Required Items",
            type: "required",
            groups: [
              {
                instruction: "Plan for and brief the crew on one or more of the visual search missions listed below. Special emphasis should be placed on mission risk assessment, routes to and from the search area, aircraft limitations and operating procedures, and communications procedures.",
                pickOne: true,
                items: [
                  { id: "r1", text: "Route search" },
                  { id: "r2", text: "Parallel track search" },
                  { id: "r3", text: "Point-based search" },
                  { id: "r4", text: "Creeping line search" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "r5", text: "Practice visual search, as planned and briefed" },
                  { id: "r6", text: "Review landing procedures with crew members" }
                ]
              },
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r7", text: "Debrief the sortie with the crew" },
                  { id: "r8", text: "Ensure mission accomplishment is properly documented" }
                ]
              }
            ]
          },
          {
            title: "Routine Items",
            type: "routine",
            instruction: "Enroute to the search area and on return to the airfield, practice the following as time and conditions permit:",
            groups: [
              {
                instruction: "Airwork:",
                pickOne: false,
                items: [
                  { id: "o1", text: "Slow Flight" },
                  { id: "o2", text: "Stalls" },
                  { id: "o3", text: "Steep turns" },
                  { id: "o4", text: "Turns around a point" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o5", text: "Simulated in-flight emergency procedures" }
                ]
              },
              {
                instruction: "Landings:",
                pickOne: false,
                items: [
                  { id: "o6", text: "Normal (full flap)" },
                  { id: "o7", text: "Normal (no flap)" },
                  { id: "o8", text: "Short-Field" },
                  { id: "o9", text: "Soft-Field" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o10", text: "Simulated forced landing (per pg. 3 restrictions)" },
                  { id: "o11", text: "Go-around" }
                ]
              },
              {
                instruction: "Approaches (if instrument qualified):",
                pickOne: false,
                conditional: "instrument",
                items: [
                  { id: "o12", text: "ILS" },
                  { id: "o13", text: "VOR" },
                  { id: "o14", text: "GPS" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 2,
        name: "Video Imaging Mission",
        prereq: "Qualified SAR/DR Mission Pilot",
        maxDuration: "1.5 hrs",
        sections: [
          {
            title: "Required Items",
            type: "required",
            instruction: "Plan for and brief the crew on one or more of the video imaging missions listed below. Special emphasis should be placed on mission risk assessments, secondary targets, aircraft limitations, operating procedures and communications procedures.",
            groups: [
              {
                instruction: "OPTION A: Fly Back Video/Still Imagery",
                pathId: "flyback",
                pickPath: true,
                items: [
                  { id: "r1a", text: "Fly back video or still imagery" },
                  { id: "r2a", text: "Take images of target(s)" }
                ]
              },
              {
                instruction: "— OR —",
                separator: true,
                items: []
              },
              {
                instruction: "OPTION B: DAART Operations",
                pathId: "daart",
                pickPath: true,
                items: [
                  { id: "r1b", text: "DAART" },
                  { id: "r2b", text: "Take images of target(s)" },
                  { id: "r3b", text: "Download images (DAART)" },
                  { id: "r4b", text: "Select images for transmission (DAART)" },
                  { id: "r5b", text: "Process images (DAART)" },
                  { id: "r6b", text: "Send images as briefed (DAART)" }
                ]
              },
              {
                instruction: "Required for all missions:",
                pickOne: false,
                items: [
                  { id: "r7", text: "Review landing procedures with crew members" },
                  { id: "r8", text: "Upload imagery to FEMA uploader" }
                ]
              },
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r9", text: "Debrief the sortie with the crew, upload/provide images as necessary" },
                  { id: "r10", text: "Ensure mission accomplishment is properly documented" }
                ]
              }
            ]
          },
          {
            title: "Routine Items",
            type: "routine",
            instruction: "Enroute to the search area and on return to the airfield, practice the following as time and conditions permit:",
            groups: [
              {
                instruction: "Airwork:",
                pickOne: false,
                items: [
                  { id: "o1", text: "Slow Flight" },
                  { id: "o2", text: "Stalls" },
                  { id: "o3", text: "Steep turns" },
                  { id: "o4", text: "Turns around a point" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o5", text: "Simulated in-flight emergency procedures" }
                ]
              },
              {
                instruction: "Landings:",
                pickOne: false,
                items: [
                  { id: "o6", text: "Normal (full flap)" },
                  { id: "o7", text: "Normal (no flap)" },
                  { id: "o8", text: "Short-Field" },
                  { id: "o9", text: "Soft-Field" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o10", text: "Simulated forced landing (per pg. 3 restrictions)" },
                  { id: "o11", text: "Go-around" }
                ]
              },
              {
                instruction: "Approaches (if instrument qualified):",
                pickOne: false,
                conditional: "instrument",
                items: [
                  { id: "o12", text: "ILS" },
                  { id: "o13", text: "VOR" },
                  { id: "o14", text: "GPS" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 3,
        name: "Electronic Search Mission",
        prereq: "Qualified SAR/DR Mission Pilot",
        maxDuration: "1.5 hrs",
        sections: [
          {
            title: "Required Items",
            type: "required",
            groups: [
              {
                instruction: "Plan for and brief the crew on one or more of the electronic search missions listed below. Special emphasis should be placed on mission risk assessments, direction finding equipment familiarizations, aircraft limitations and operating procedures, and communications procedures.",
                pickOne: true,
                items: [
                  { id: "r1", text: "Electronic Search Utilizing the Wing-Null Method" },
                  { id: "r2", text: "Electronic search utilizing the L-Tronics Airborne DF Unit" },
                  { id: "r3", text: "Electronic search utilizing the Becker/Rhotheta Airborne DF Unit" }
                ]
              },
              {
                instruction: "Practice electronic search sortie, as planned and briefed:",
                pickOne: false,
                items: [
                  { id: "r4", text: "Track the beacon to its source" },
                  { id: "r5", text: "Lead a ground or urban direction-finding team to the source" },
                  { id: "r6", text: "Provide detailed location information to ground personnel" },
                  { id: "r7", text: "Provide a short verbal description of the target" },
                  { id: "r8", text: "Provide accurate latitude and longitude coordinates of the target" },
                  { id: "r9", text: "If target at airfield with ground equipment, locate beacon on airfield" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "r10", text: "Review landing procedures with crew members" }
                ]
              },
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r11", text: "Debrief the sortie with the crew, upload/provide images" },
                  { id: "r12", text: "Ensure mission accomplishment is properly documented" }
                ]
              }
            ]
          },
          {
            title: "Routine Items",
            type: "routine",
            instruction: "Enroute to the search area and on return to the airfield, practice the following as time and conditions permit:",
            groups: [
              {
                instruction: "Airwork:",
                pickOne: false,
                items: [
                  { id: "o1", text: "Slow Flight" },
                  { id: "o2", text: "Stalls" },
                  { id: "o3", text: "Steep turns" },
                  { id: "o4", text: "Turns around a point" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o5", text: "Simulated in-flight emergency procedures" }
                ]
              },
              {
                instruction: "Landings:",
                pickOne: false,
                items: [
                  { id: "o6", text: "Normal (full flap)" },
                  { id: "o7", text: "Normal (no flap)" },
                  { id: "o8", text: "Short-Field" },
                  { id: "o9", text: "Soft-Field" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o10", text: "Simulated forced landing (per pg. 3 restrictions)" },
                  { id: "o11", text: "Go-around" }
                ]
              },
              {
                instruction: "Approaches (if instrument qualified):",
                pickOne: false,
                conditional: "instrument",
                items: [
                  { id: "o12", text: "ILS" },
                  { id: "o13", text: "VOR" },
                  { id: "o14", text: "GPS" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 4,
        name: "Transportation Mission",
        prereq: "Qualified Transport Mission Pilot",
        maxDuration: "2.5 hrs (3.0 HIWG)",
        sections: [
          {
            title: "Required Items",
            type: "required",
            groups: [
              {
                instruction: "This flight will consist of a minimum of three navigation legs that will include approaches at a minimum of two different airfields. Approaches may be to a full stop landing, touch-and-go landing or planned low approach/go-around. (Profiles flown in HIWG can consist of only two navigation legs.)\n\nPlan the transportation mission as follows:",
                pickOne: false,
                items: [
                  { id: "r1", text: "Obtain all passenger and cargo weight and description" },
                  { id: "r2", text: "Determine the load distribution and placement in the airplane" },
                  { id: "r3", text: "Compute a weight and balance for the specific load" },
                  { id: "r4", text: "Compute takeoff & landing performance for the specific load" },
                  { id: "r5", text: "Check departure & destination runway lengths, services, ATC frequencies, & procedures" },
                  { id: "r6", text: "Obtain a standard WX briefing, NOTAMS, and active TFRs from local FSS" },
                  { id: "r7", text: "Determine fuel requirements, alternates needed, and any known ATC delays" },
                  { id: "r8", text: "Check the currency and appropriateness of all flight information publications" },
                  { id: "r9", text: "Review overwater/extended overwater requirements/procedures (as applicable)" }
                ]
              },
              {
                instruction: "Address the following during your briefings:",
                pickOne: false,
                items: [
                  { id: "r10", text: "Brief crew member mission responsibilities and assign duties" },
                  { id: "r11", text: "Review ground and in-flight emergency procedures, taxi, takeoff, and in-flight procedures with each crew member" },
                  { id: "r12", text: "Brief passengers on emergency and egress procedures prior to the pre-flight inspection" },
                  { id: "r13", text: "Review water survival, ditching procedures, life vest and raft use, and survival equipment use with crew and passengers prior to boarding (as applicable)" }
                ]
              },
              {
                instruction: "Execute the mission, as planned and briefed, to include:",
                pickOne: false,
                items: [
                  { id: "r14", text: "Perform a normal, short field or soft field takeoff" },
                  { id: "r15", text: "Perform after takeoff, level off, and cruise checklist as appropriate" },
                  { id: "r16", text: "During cruise compute TAS, ground speed, ETA, fuel burn, and landing fuel load" },
                  { id: "r17", text: "Practice or discuss simulated in-flight emergency procedures" },
                  { id: "r18", text: "Approaching destinations, communicate with ATC (if appropriate)" },
                  { id: "r19", text: "Review landing procedures with crew members" },
                  { id: "r20", text: "At each destination perform a minimum of one VFR or IFR approach procedure" }
                ]
              },
              {
                instruction: "Perform at least one of the following at each airfield. Ensure that all five are accomplished during the sortie:",
                pickOne: false,
                items: [
                  { id: "r21", text: "Normal landing, using full flaps, to a touch and go (if runway and conditions allow)" },
                  { id: "r22", text: "Normal landing, using no flaps, to a full stop" },
                  { id: "r23", text: "Short-Field landing to a full stop" },
                  { id: "r24", text: "Soft-Field landing to a full stop" },
                  { id: "r25", text: "Simulated forced landing (per pg. 3 restrictions) to low approach or full stop" }
                ]
              },
              {
                instruction: "If instrument qualified, perform at least one of the approaches listed below during the profile:",
                pickOne: true,
                conditional: "instrument",
                items: [
                  { id: "r26", text: "ILS" },
                  { id: "r27", text: "VOR" },
                  { id: "r28", text: "GPS" }
                ]
              },
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r29", text: "Debrief the sortie with the crew" },
                  { id: "r30", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 5,
        name: "CAPF 91 Practice",
        prereq: "Qualified SAR/DR MP + another MP + MO and/or MS",
        maxDuration: "1.5 hrs",
        note: "This profile will not be flown solo. Supervisors must be qualified PICs in the aircraft flown.",
        sections: [
          {
            title: "Required Items",
            type: "required",
            groups: [
              {
                instruction: "Accomplish at least one of the following mission profiles – more if safety, time, and conditions permit:",
                pickOne: true,
                items: [
                  { id: "r1", text: "Adequately demonstrate visual search patterns and procedures" },
                  { id: "r2", text: "Adequately demonstrate electronic search patterns and procedures" },
                  { id: "r3", text: "Adequately demonstrate Mountainous Terrain Procedures" }
                ]
              },
              {
                instruction: "Plan the CAPF 91 training flight by reviewing the CAPR 60-3 and CAPF 91 in advance:",
                pickOne: false,
                items: [
                  { id: "r4", text: "Demonstrate thorough and appropriate preflight planning" },
                  { id: "r5", text: "Demonstrate a disciplined approach to risk management" }
                ]
              },
              {
                instruction: "Prior to flight, the supervising Mission Pilot shall:",
                pickOne: false,
                items: [
                  { id: "r6", text: "Verify the wearing of an appropriate CAP uniform" },
                  { id: "r7", text: "Verify the aircraft to be used is airworthy with all required documents in order" },
                  { id: "r8", text: "Conduct an oral review determining qualifications of both mission pilots" },
                  { id: "r9", text: "Conduct an oral review to determine appropriate knowledge base of the CAP mission pilot" }
                ]
              },
              {
                instruction: "Execute the mission, as planned and briefed, to include:",
                pickOne: false,
                items: [
                  { id: "r10", text: "Adequately demonstrate mission flight maneuvers, as planned/briefed" },
                  { id: "r11", text: "Demonstrate appropriate crew resource/risk management during flight" },
                  { id: "r12", text: "Adequately demonstrate the ability to successfully handle emergency procedures" },
                  { id: "r13", text: "Review landing procedures with crew members" }
                ]
              },
              {
                instruction: "Practice landing procedures by completing one or more of the following:",
                pickOne: true,
                items: [
                  { id: "r14", text: "Normal landing, using full flaps, to a touch and go (if runway and conditions allow)" },
                  { id: "r15", text: "Normal landing, using no flaps, to a full stop" },
                  { id: "r16", text: "Short-Field landing to a full stop" },
                  { id: "r17", text: "Soft-Field landing to a full stop" },
                  { id: "r18", text: "Simulated forced landing (per pg. 3 restrictions) to low approach or full stop" },
                  { id: "r19", text: "Execute a go-around" }
                ]
              },
              {
                instruction: "If instrument qualified, perform at least one of the approaches listed below during the profile:",
                pickOne: true,
                conditional: "instrument",
                items: [
                  { id: "r20", text: "ILS" },
                  { id: "r21", text: "VOR" },
                  { id: "r22", text: "GPS" }
                ]
              },
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r23", text: "Debrief the sortie with the crew" },
                  { id: "r24", text: "Review the CAPF 91 with the trainee" },
                  { id: "r25", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 6,
        name: "Mountain Search Mission",
        prereq: "Qualified SAR/DR Mission Pilot",
        maxDuration: "1.5 hrs",
        sections: [
          {
            title: "Required Items",
            type: "required",
            groups: [
              {
                instruction: "Plan for and brief one or more of the following mountain search missions:",
                pickOne: true,
                items: [
                  { id: "r1", text: "Contour Search" },
                  { id: "r2", text: "Steep Valley/Drainage Search" },
                  { id: "r3", text: "Cove Search" },
                  { id: "r4", text: "Canyon Search" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "r5", text: "Evaluate the impact of density altitude on aircraft performance using PA and temperature" }
                ]
              },
              {
                instruction: "During flight while enroute or after reaching the search area, practice one or more of the following:",
                pickOne: true,
                items: [
                  { id: "r6", text: "Ridge crossing procedures" },
                  { id: "r7", text: "Modified racetrack maneuver" },
                  { id: "r8", text: "Teardrop course reversal" },
                  { id: "r9", text: "Escape from high sink rates or turbulence" },
                  { id: "r10", text: "Emergency course reversal (escape maneuver) at min 2000' AGL" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "r11", text: "Practice mountain search procedures, as planned and briefed" },
                  { id: "r12", text: "Review landing procedures with crew members" }
                ]
              },
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r13", text: "Debrief the sortie with the crew" },
                  { id: "r14", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          },
          {
            title: "Routine Items",
            type: "routine",
            instruction: "On return to the airfield, practice the following as time and conditions permit:",
            groups: [
              {
                instruction: "Landings:",
                pickOne: false,
                items: [
                  { id: "o1", text: "Normal (full flap)" },
                  { id: "o2", text: "Normal (no flap)" },
                  { id: "o3", text: "Short-Field" },
                  { id: "o4", text: "Soft-Field" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o5", text: "Simulated forced landing (per pg. 3 restrictions)" },
                  { id: "o6", text: "Go-around" }
                ]
              },
              {
                instruction: "Approaches (if instrument qualified):",
                pickOne: false,
                conditional: "instrument",
                items: [
                  { id: "o7", text: "ILS" },
                  { id: "o8", text: "VOR" },
                  { id: "o9", text: "GPS" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 7,
        name: "Basic Aircraft Proficiency",
        prereq: "Any qualified CAP VFR Pilot",
        maxDuration: "1.5 hrs",
        note: "PICs will coordinate selection of the appropriate ground and flight training blocks with their unit commander.",
        sections: [
          {
            title: "Required Items",
            type: "required",
            groups: [
              {
                instruction: "Ground Training (one of the following must be accomplished prior to the flight):",
                pickOne: true,
                items: [
                  { id: "r1", text: "Attend one of the AOPA Air Safety Foundation's Safety Seminars" },
                  { id: "r2", text: "Complete one of the AOPA Air Safety Foundation's Online Courses" },
                  { id: "r3", text: "Attend a CAP-USAF LR/CC approved CAP safety briefing" },
                  { id: "r4", text: "Attend a briefing conducted by an FAA Safety Team Representative" },
                  { id: "r5", text: "IPC - One hour of ground instruction by a CFI (topics at discretion of CFI)" }
                ]
              },
              {
                instruction: "Flight Training (required for all sorties):",
                pickOne: false,
                items: [
                  { id: "r6", text: "Plan for and brief one of the training blocks listed below" },
                  { id: "r7", text: "Brief crew member mission responsibilities as appropriate" },
                  { id: "r8", text: "Review ground & in-flight emergency procedures, taxi, takeoff, and in-flight procedures with each crewmember" }
                ]
              },
              {
                instruction: "Execute the selected training block (select one block, then complete its sub-checklist):",
                pickOne: true,
                items: [
                  { 
                    id: "r9", 
                    text: "Training Block 1: Basic Air Work",
                    subChecklist: {
                      instruction: "Complete the following maneuvers:",
                      items: [
                        { id: "b1-1", text: "Slow flight" },
                        { id: "b1-2", text: "Stalls" },
                        { id: "b1-3", text: "Steep turns" },
                        { id: "b1-4", text: "Turns around a point" },
                        { id: "b1-5", text: "Basic instrument maneuvers" },
                        { id: "b1-6", text: "Practice simulated in-flight emergency procedures" }
                      ]
                    }
                  },
                  { 
                    id: "r10", 
                    text: "Training Block 2: Takeoffs and Landings",
                    subChecklist: {
                      instruction: "Complete the following takeoff and landing exercises:",
                      note: "Block 2 may be used to maintain takeoff and landing currency by conducting at least 3 takeoffs and 3 landings.",
                      items: [
                        { id: "b2-1", text: "Perform a normal takeoff to partial and full flap landings" },
                        { id: "b2-2", text: "Perform a short field takeoff to a short field landing (full stop)" },
                        { id: "b2-3", text: "Perform a soft field takeoff to a soft field landing (full stop)" },
                        { id: "b2-4", text: "Practice proper crosswind takeoff and landing techniques" },
                        { id: "b2-5", text: "Perform a simulated forced landing (IAW pg. 3 restrictions) to low approach or full stop" },
                        { id: "b2-6", text: "Perform no-flap landing to a full stop" },
                        { id: "b2-7", text: "Execute at least one go-around" }
                      ]
                    }
                  },
                  { 
                    id: "r11", 
                    text: "Training Block 3: Instrument Procedures",
                    subChecklist: {
                      instruction: "At a minimum, there must be a safety pilot onboard for this block. If an IPC is to be accomplished, a CFII qualified in the aircraft flown is required.",
                      note: "Must meet all published FAA requirements when seeking IPC credit. If autopilot equipped, hand fly at least one approach.",
                      items: [
                        { id: "b3-1", text: "Flight by reference to instruments" },
                        { id: "b3-2", text: "Navigation" },
                        { id: "b3-3", text: "ILS approach (as time allows)" },
                        { id: "b3-4", text: "VOR approach (as time allows)" },
                        { id: "b3-5", text: "GPS approach (as time allows)" },
                        { id: "b3-6", text: "At least one published missed approach accomplished" },
                        { id: "b3-7", text: "At least one Hold accomplished (if available)" }
                      ]
                    }
                  }
                ]
              },
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r12", text: "Debrief the sortie with the crew" },
                  { id: "r13", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 8,
        name: "Counterdrug Mission",
        prereq: "Qualified SAR/DR Mission Pilot",
        maxDuration: "1.5 hrs",
        sections: [
          {
            title: "Required Items",
            type: "required",
            groups: [
              {
                instruction: "Plan for and brief the crew on one or more of the visual search missions below. Special emphasis should be placed on mission risk assessments, the routes to and from the search area, aircraft limitations and operating procedures and communications procedures. Route and low-level route searches should be planned to have multiple turn points and specific times over each point.",
                pickOne: true,
                items: [
                  { id: "r1", text: "Route search" },
                  { id: "r2", text: "Parallel track search" },
                  { id: "r3", text: "Point-based search" },
                  { id: "r4", text: "Creeping line search" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "r5", text: "Brief crew member mission responsibilities as appropriate" },
                  { id: "r6", text: "Review ground and in-flight emergency procedures, taxi, takeoff, and in-flight procedures with each crew member" },
                  { id: "r7", text: "Practice visual searches, as planned and briefed" },
                  { id: "r8", text: "Review landing procedures with crew members" }
                ]
              },
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r9", text: "Debrief the sortie with the crew" },
                  { id: "r10", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          },
          {
            title: "Routine Items",
            type: "routine",
            instruction: "Enroute to the search area and on return to the airfield, practice the following as time and conditions permit:",
            groups: [
              {
                instruction: "Airwork:",
                pickOne: false,
                items: [
                  { id: "o1", text: "Slow Flight" },
                  { id: "o2", text: "Stalls" },
                  { id: "o3", text: "Steep turns" },
                  { id: "o4", text: "Turns around a point" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o5", text: "Simulated in-flight emergency procedures" }
                ]
              },
              {
                instruction: "Landings:",
                pickOne: false,
                items: [
                  { id: "o6", text: "Normal (full flap)" },
                  { id: "o7", text: "Normal (no flap)" },
                  { id: "o8", text: "Short-Field" },
                  { id: "o9", text: "Soft-Field" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o10", text: "Simulated forced landing (per pg. 3 restrictions)" },
                  { id: "o11", text: "Go-around" }
                ]
              },
              {
                instruction: "Approaches (if instrument qualified):",
                pickOne: false,
                conditional: "instrument",
                items: [
                  { id: "o12", text: "ILS" },
                  { id: "o13", text: "VOR" },
                  { id: "o14", text: "GPS" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 9,
        name: "Low-Level Route Survey (LLRS)",
        prereq: "Qualified SAR/DR Mission Pilot",
        maxDuration: "1.5 hrs",
        sections: [
          {
            title: "Required Items",
            type: "required",
            groups: [
              {
                instruction: "Plan for and brief the crew on one or more of the visual search missions below. Special emphasis should be placed on mission risk assessments, the routes to and from the search area, aircraft limitations and operating procedures, and communications procedures.",
                pickOne: true,
                items: [
                  { id: "r1", text: "Route search" },
                  { id: "r2", text: "Low-level route search (no lower than 1000' AGL)" }
                ]
              },
              {
                instruction: "Route and low-level route searches should be planned to have multiple turn points and specific times over each point. Resources needed: Current FAA Sectional, DoD AP/1B (MTR only), Telephone, Internet access.",
                pickOne: false,
                items: [
                  { id: "r3", text: "Brief crew member mission responsibilities as appropriate" },
                  { id: "r4", text: "Review ground and in-flight emergency procedures, taxi, takeoff, and in-flight procedures with each crew member" }
                ]
              },
              {
                instruction: "Conduct and brief a pre-sortie route study including the following:",
                pickOne: false,
                items: [
                  { id: "r5", text: "High terrain" },
                  { id: "r6", text: "Towers" },
                  { id: "r7", text: "Airspace (MOAs, TFRs, etc.)" },
                  { id: "r8", text: "Uncontrolled airfields" },
                  { id: "r9", text: "Bird migration routes (http://www.usahas.com/)" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "r10", text: "Practice visual searches, as planned and briefed" }
                ]
              },
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r11", text: "Debrief the sortie with the crew" },
                  { id: "r12", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          },
          {
            title: "Routine Items",
            type: "routine",
            instruction: "On return to the airfield, practice the following as time and conditions permit:",
            groups: [
              {
                instruction: "Landings:",
                pickOne: false,
                items: [
                  { id: "o1", text: "Normal (full flap)" },
                  { id: "o2", text: "Normal (no flap)" },
                  { id: "o3", text: "Short-Field" },
                  { id: "o4", text: "Soft-Field" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o5", text: "Simulated forced landing (per pg. 3 restrictions)" },
                  { id: "o6", text: "Go-around" }
                ]
              },
              {
                instruction: "Approaches (if instrument qualified):",
                pickOne: false,
                conditional: "instrument",
                items: [
                  { id: "o7", text: "ILS" },
                  { id: "o8", text: "VOR" },
                  { id: "o9", text: "GPS" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 10,
        name: "High-Performance/Complex Aircraft",
        prereq: "Qualified SAR/DR/Transport/IP/OP/CP",
        maxDuration: "1.5 hrs",
        note: "This profile will only be flown in high performance, complex or unique aircraft (C182, C206, GA-8, Retractable Gear, Float Plane, Ski Equipped Aircraft, etc.). This proficiency profile will be accomplished locally or within 50 NM of the aircraft's departure airfield.",
        sections: [
          {
            title: "Required Items",
            type: "required",
            groups: [
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "r1", text: "Brief crew member mission responsibilities as appropriate" },
                  { id: "r2", text: "Review ground and in-flight emergency procedures, taxi, takeoff, and in-flight procedures with each crew member" },
                  { id: "r3", text: "Review POH checklists and amplified procedures for takeoffs and landings including short field, soft field, and crosswind control procedures" }
                ]
              },
              {
                instruction: "Perform as many as conditions/time allow:",
                pickOne: false,
                items: [
                  { id: "r4", text: "Normal takeoff and partial flap landing to analyze crosswinds" },
                  { id: "r5", text: "Normal landing using full flaps" },
                  { id: "r6", text: "Short field takeoff and landing to a full stop" },
                  { id: "r7", text: "Soft field takeoff and landing to a full stop" },
                  { id: "r8", text: "No-flap landing to a full stop" },
                  { id: "r9", text: "Go-around" }
                ]
              },
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r10", text: "Debrief the sortie with the crew" },
                  { id: "r11", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 11,
        name: "Glider Aero-Tow",
        prereq: "Qualified CAP Glider Pilot",
        maxDuration: "4 aero-tow launches",
        note: "A CAP Instructor Pilot is only required for this proficiency profile when preparing for a Form 5, when inducing slack rope or simulating emergencies such as a rope break.",
        sections: [
          {
            title: "Ground Training",
            type: "required",
            groups: [
              {
                instruction: "The following must be completed within 30 days prior to the Glider Pilot's first aero-towed or ground launched glider flight of the year:",
                pickOne: false,
                items: [
                  { id: "r1", text: "Online SSF/CAP Wing Runner Course" }
                ]
              },
              {
                instruction: "AND one of the following must be accomplished prior to the flight:",
                pickOne: true,
                items: [
                  { id: "r2", text: "Attend one of the AOPA Air Safety Foundation's Glider Safety Seminars" },
                  { id: "r3", text: "Complete one of the AOPA Air Safety Foundation's Glider Online Courses" },
                  { id: "r4", text: "Attend a CAP-USAF LR/CC approved CAP Glider safety briefing" },
                  { id: "r5", text: "Attend a Glider briefing conducted by an FAA Safety Team Representative" },
                  { id: "r6", text: "One hour of Glider ground instruction by a CFI (topics at discretion of CFI)" }
                ]
              }
            ]
          },
          {
            title: "Flight Training",
            type: "required",
            groups: [
              {
                instruction: "Perform the following:",
                pickOne: false,
                items: [
                  { id: "r7", text: "Glider preflight" },
                  { id: "r8", text: "Tow rope or cable inspection" },
                  { id: "r9", text: "Release check" },
                  { id: "r10", text: "Conduct a Safety Briefing: Include review of launch, retrieval, emergency and airfield procedures, for all ground and flight crew members" }
                ]
              }
            ]
          },
          {
            title: "Flight Items",
            type: "routine",
            instruction: "Perform as many as conditions/time allow:",
            groups: [
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o1", text: "Normal takeoff" },
                  { id: "o2", text: "Crosswind takeoff" },
                  { id: "o3", text: "Unassisted takeoff" },
                  { id: "o4", text: "Box Tow" },
                  { id: "o5", text: "Slack rope" },
                  { id: "o6", text: "Descent on tow" },
                  { id: "o7", text: "Non-emergency airborne signals (turn, speed up, decrease speed)" },
                  { id: "o8", text: "Normal release" },
                  { id: "o9", text: "Simulate instrument failure (altimeter and/or airspeed)" },
                  { id: "o10", text: "Soft release (Schweizer gliders only)" },
                  { id: "o11", text: "Slow flight" },
                  { id: "o12", text: "Straight ahead & turning stalls" },
                  { id: "o13", text: "Steep turns" },
                  { id: "o14", text: "Soaring (thermal, wave, ridge or sea breeze)" },
                  { id: "o15", text: "No divebrake landing" },
                  { id: "o16", text: "Normal landing" },
                  { id: "o17", text: "Downwind landing" },
                  { id: "o18", text: "Simulated off-airport landing" },
                  { id: "o19", text: "Precision landing" }
                ]
              }
            ]
          },
          {
            title: "After Flight",
            type: "required",
            groups: [
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r11", text: "Debrief the sortie with the crew" },
                  { id: "r12", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 12,
        name: "Glider Ground-Launch",
        prereq: "Qualified CAP Glider Pilot",
        maxDuration: "10 ground-launches",
        note: "A CAP Instructor Pilot is only required for this proficiency profile when preparing for a Form 5, or when simulating emergencies, such as a cable break.",
        sections: [
          {
            title: "Ground Training",
            type: "required",
            groups: [
              {
                instruction: "The following must be completed within 30 days prior to the Glider Pilot's first aero-towed or ground launched glider flight of the year:",
                pickOne: false,
                items: [
                  { id: "r1", text: "Online SSF/CAP Wing Runner Course" }
                ]
              },
              {
                instruction: "AND one of the following must be accomplished prior to the flight:",
                pickOne: true,
                items: [
                  { id: "r2", text: "Attend one of the AOPA Air Safety Foundation's Glider Safety Seminars" },
                  { id: "r3", text: "Complete one of the AOPA Air Safety Foundation's Glider Online Courses" },
                  { id: "r4", text: "Attend a CAP-USAF LR/CC approved CAP Glider safety briefing" },
                  { id: "r5", text: "Attend a Glider briefing conducted by an FAA Safety Team Representative" },
                  { id: "r6", text: "One hour of Glider ground instruction by a CFI (topics at discretion of CFI)" }
                ]
              }
            ]
          },
          {
            title: "Flight Training",
            type: "required",
            groups: [
              {
                instruction: "Perform the following:",
                pickOne: false,
                items: [
                  { id: "r7", text: "Glider preflight" },
                  { id: "r8", text: "Tow rope or cable inspection" },
                  { id: "r9", text: "Release check" },
                  { id: "r10", text: "Conduct a Safety Briefing: Include review of launch, retrieval, emergency and airfield procedures, for all ground and flight crew members" }
                ]
              }
            ]
          },
          {
            title: "Flight Items",
            type: "routine",
            instruction: "Perform as many as conditions/time allow:",
            groups: [
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o1", text: "Normal takeoff" },
                  { id: "o2", text: "Crosswind takeoff" },
                  { id: "o3", text: "Normal release" },
                  { id: "o4", text: "Non-emergency airborne signals (speed up, decrease speed)" },
                  { id: "o5", text: "Simulate cable break" },
                  { id: "o6", text: "Slow flight" },
                  { id: "o7", text: "Straight ahead & turning stalls" },
                  { id: "o8", text: "Steep turns" },
                  { id: "o9", text: "Soaring (thermal, wave, ridge or sea breeze)" },
                  { id: "o10", text: "No divebrake landing" },
                  { id: "o11", text: "Normal landing" },
                  { id: "o12", text: "Downwind landing" },
                  { id: "o13", text: "Simulated off-airport landing" },
                  { id: "o14", text: "Precision landing" }
                ]
              }
            ]
          },
          {
            title: "After Flight",
            type: "required",
            groups: [
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r11", text: "Debrief the sortie with the crew" },
                  { id: "r12", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 13,
        name: "Tow Pilot",
        prereq: "Qualified CAP Tow Pilot",
        maxDuration: "2.0 hrs",
        note: "Whenever possible, a second qualified CAP Tow Pilot shall occupy the right seat of the tow aircraft, as a crewmember, for training purposes.",
        sections: [
          {
            title: "Ground Training",
            type: "required",
            groups: [
              {
                instruction: "The following must be completed within 30 days prior to the Tow Pilot's first tow flight of the year:",
                pickOne: false,
                items: [
                  { id: "r1", text: "Online SSF/CAP Tow Pilot Course" }
                ]
              }
            ]
          },
          {
            title: "Flight Training",
            type: "required",
            groups: [
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "r2", text: "Conduct a Safety Briefing: Include review of launch, retrieval, emergency and airfield procedures, for all ground and flight crew members" }
                ]
              }
            ]
          },
          {
            title: "Flight Items",
            type: "routine",
            instruction: "Perform as many as conditions/time allow:",
            groups: [
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o1", text: "Normal take-off" },
                  { id: "o2", text: "Crosswind take-off" },
                  { id: "o3", text: "Boxed tow" },
                  { id: "o4", text: "Problem and emergency release signals" },
                  { id: "o5", text: "Descent on tow" },
                  { id: "o6", text: "Normal release" },
                  { id: "o7", text: "Low altitude release" },
                  { id: "o8", text: "Normal landing" },
                  { id: "o9", text: "Crosswind landing" },
                  { id: "o10", text: "Short field landing" },
                  { id: "o11", text: "Soft field landing" }
                ]
              }
            ]
          },
          {
            title: "After Flight",
            type: "required",
            groups: [
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r3", text: "Debrief the launches and flight with the crew" },
                  { id: "r4", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 14,
        name: "Cadet Recurrent Training (Powered)",
        prereq: "Cadet with Private Pilot Certificate",
        maxDuration: "1.8 hrs/calendar month",
        note: "Multiple sorties are permissible under this profile. A CAP Instructor Pilot is required when recency of flying in category/class exceeds 90 days.",
        sections: [
          {
            title: "Required Items",
            type: "required",
            groups: [
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "r1", text: "Review POH checklists and amplified procedures for takeoffs and landings including short field, soft field, and crosswind control procedures" }
                ]
              }
            ]
          },
          {
            title: "Basic Air Work",
            type: "routine",
            instruction: "Perform basic air work, as conditions and time permit:",
            groups: [
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o1", text: "Slow Flight" },
                  { id: "o2", text: "Stalls" },
                  { id: "o3", text: "Steep turns" },
                  { id: "o4", text: "Turns around a point" },
                  { id: "o5", text: "Basic instrument maneuvers" }
                ]
              }
            ]
          },
          {
            title: "Landings",
            type: "routine",
            instruction: "Perform as many as conditions/time allow:",
            groups: [
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o6", text: "Normal takeoff and partial flap landing to analyze crosswinds" },
                  { id: "o7", text: "Normal landing using full flaps" },
                  { id: "o8", text: "Short field takeoff and landing to a full stop" },
                  { id: "o9", text: "Soft field takeoff and landing to a full stop" },
                  { id: "o10", text: "No-flap landing to a full stop" },
                  { id: "o11", text: "Go-around" }
                ]
              }
            ]
          },
          {
            title: "After Flight",
            type: "required",
            groups: [
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r2", text: "Critique/Debrief your performance, as appropriate" },
                  { id: "r3", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 15,
        name: "Cadet Recurrent (Glider)",
        prereq: "Cadet with Private Pilot Certificate - Glider",
        maxDuration: "3 aero-tows or 10 ground-launches/month",
        note: "Multiple sorties are permissible under this profile. A CAP Instructor Pilot is required when recency of flying in category/class exceeds 90 days.",
        sections: [
          {
            title: "Required Items",
            type: "required",
            groups: [
              {
                instruction: "Perform the following:",
                pickOne: false,
                items: [
                  { id: "r1", text: "Glider preflight" },
                  { id: "r2", text: "Tow rope or cable inspection" },
                  { id: "r3", text: "Release check" },
                  { id: "r4", text: "Conduct a Safety Briefing: Include review of launch, retrieval, emergency and airfield procedures, for all ground and flight crew members" }
                ]
              }
            ]
          },
          {
            title: "Flight Items",
            type: "routine",
            instruction: "Perform as many as conditions/launch method/time allow:",
            groups: [
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o1", text: "Normal takeoff" },
                  { id: "o2", text: "Crosswind takeoff" },
                  { id: "o3", text: "Unassisted takeoff" },
                  { id: "o4", text: "Box Tow" },
                  { id: "o5", text: "Descent on tow" },
                  { id: "o6", text: "Non-emergency airborne signals (turn, speed up, decrease speed)" },
                  { id: "o7", text: "Normal release" },
                  { id: "o8", text: "Soft release (Schweizer gliders only)" },
                  { id: "o9", text: "Slow flight" },
                  { id: "o10", text: "Straight ahead & turning stalls" },
                  { id: "o11", text: "Steep turns" },
                  { id: "o12", text: "Soaring (thermal, wave, ridge or sea breeze)" },
                  { id: "o13", text: "No divebrake landing" },
                  { id: "o14", text: "Normal landing" },
                  { id: "o15", text: "Downwind landing" },
                  { id: "o16", text: "Precision landing" }
                ]
              }
            ]
          },
          {
            title: "After Flight",
            type: "required",
            groups: [
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r5", text: "Critique/Debrief your performance, as appropriate" },
                  { id: "r6", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 16,
        name: "Instrument Proficiency",
        prereq: "CAP Instrument Pilot + Safety Pilot (CFII for IPC)",
        maxDuration: "1.5 hrs",
        note: "This profile may be flown to maintain recent flight experience requirements under 14 CFR 61.57(c) or to complete an instrument proficiency check (14 CFR 61.57(d)). Must meet all published FAA requirements when seeking IPC credit.",
        sections: [
          {
            title: "Required Items",
            type: "required",
            groups: [
              {
                instruction: "Ground Training (one of the following must be accomplished prior to the flight):",
                pickOne: true,
                conditional: "ipcOnly",
                items: [
                  { id: "r1", text: "IPC only - One hour of ground instruction by a CFI (topics at discretion of CFI)" }
                ]
              },
              {
                instruction: "Flight Training (required for all sorties):",
                pickOne: false,
                items: [
                  { id: "r2", text: "Brief crew member mission responsibilities as appropriate" },
                  { id: "r3", text: "Review ground & in-flight emergency procedures, taxi, takeoff, and in-flight procedures, to include autopilot/trim, with each crew member" },
                  { id: "r4", text: "Flight by reference to instruments" },
                  { id: "r5", text: "Navigation" }
                ]
              },
              {
                instruction: "Fly as many approaches as time allows:",
                pickOne: false,
                items: [
                  { id: "r6", text: "A minimum of one precision and one non-precision approach" },
                  { id: "r7", text: "A minimum of one published missed approach will be accomplished" },
                  { id: "r8", text: "A minimum of one Hold will be accomplished, if available" },
                  { id: "r9", text: "If autopilot equipped, at least one approach with and one without A/P engaged" }
                ]
              },
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r10", text: "Debrief the sortie with the crew" },
                  { id: "r11", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 17,
        name: "IP/CP Right-Seat Proficiency",
        prereq: "Qualified Instructor Pilot or Check Pilot",
        maxDuration: "1.5 hrs",
        note: "This proficiency profile shall include a qualified CAP VFR Pilot in the left seat. This proficiency profile will be accomplished locally or within 50 NM of the aircraft's departure airfield.",
        sections: [
          {
            title: "Required Items",
            type: "required",
            groups: [
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "r1", text: "Brief crew member mission responsibilities as appropriate" },
                  { id: "r2", text: "Review ground and in-flight emergency procedures, taxi, takeoff, and in-flight procedures with each crew member" },
                  { id: "r3", text: "Review POH checklists and amplified procedures for takeoffs and landings including short field, soft field, and crosswind control procedures" }
                ]
              },
              {
                instruction: "Perform as many as conditions/time allow from the right-seat:",
                pickOne: false,
                items: [
                  { id: "r4", text: "Normal takeoff and partial flap landing" },
                  { id: "r5", text: "Normal landing using full flaps" },
                  { id: "r6", text: "Short field takeoff and landing to a full stop" },
                  { id: "r7", text: "Soft field takeoff and landing to a full stop" },
                  { id: "r8", text: "No-flap landing to a full stop" },
                  { id: "r9", text: "Go-around" }
                ]
              },
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r10", text: "Debrief the sortie with the crew" },
                  { id: "r11", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 18,
        name: "Tsunami Proficiency",
        prereq: "Qualified SAR/DR MP (states with tsunami warning)",
        maxDuration: "2.5 hrs",
        sections: [
          {
            title: "Required Items",
            type: "required",
            groups: [
              {
                instruction: "Plan for and brief the crew on a Tsunami Warning Mission. Special emphasis should be placed on mission risk assessment, wing-specific Tsunami Warning routes, Overwater and Extended Overwater operations including ditching briefing, weather, minimum altitudes, aircraft limitations and operating procedures, and communications procedures.",
                pickOne: false,
                items: [
                  { id: "r1", text: "Review operating procedures for Tsunami Siren and PA systems" },
                  { id: "r2", text: "Test with volume turned down during pre-flight inspection" },
                  { id: "r3", text: "Practice Tsunami Warning Mission, as planned and briefed" },
                  { id: "r4", text: "Optionally, brief and practice a momentary descent below warning mission altitude to confirm an observation and photograph an item of interest on the shoreline" },
                  { id: "r5", text: "Review landing procedures with crewmembers" }
                ]
              },
              {
                instruction: "After the flight:",
                pickOne: false,
                items: [
                  { id: "r6", text: "Debrief the sortie with the crew, review items that would be reported back to mission base for relay to the state EMA" },
                  { id: "r7", text: "Document completion in accordance with provided instructions" }
                ]
              }
            ]
          },
          {
            title: "Routine Items",
            type: "routine",
            instruction: "Enroute to the start of the route, at an appropriate location during the route, and/or on return to the airfield, practice the following as time and conditions permit:",
            groups: [
              {
                instruction: "Airwork:",
                pickOne: false,
                items: [
                  { id: "o1", text: "Slow Flight" },
                  { id: "o2", text: "Stalls" },
                  { id: "o3", text: "Steep turns" },
                  { id: "o4", text: "Turns around a point" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o5", text: "Simulated in-flight emergency procedures" }
                ]
              },
              {
                instruction: "Landings:",
                pickOne: false,
                items: [
                  { id: "o6", text: "Normal (full flap)" },
                  { id: "o7", text: "Normal (no flap)" },
                  { id: "o8", text: "Short-Field" },
                  { id: "o9", text: "Soft-Field" }
                ]
              },
              {
                instruction: null,
                pickOne: false,
                items: [
                  { id: "o10", text: "Simulated forced landing (per pg. 3 restrictions)" },
                  { id: "o11", text: "Go-around" }
                ]
              },
              {
                instruction: "Approaches (if instrument qualified):",
                pickOne: false,
                conditional: "instrument",
                items: [
                  { id: "o12", text: "ILS" },
                  { id: "o13", text: "VOR" },
                  { id: "o14", text: "GPS" }
                ]
              }
            ]
          }
        ]
      }
  ];
  
  // Expose to namespace
  MAT.data.proficiencyProfiles = proficiencyProfiles;
  
  // Also expose as global for backward compatibility
  window.proficiencyProfiles = proficiencyProfiles;
  
})();
