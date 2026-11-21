import type { MockTestRecord, TestQuestionRecord } from "../types";
import { getDefaultExamInstructions } from "../utils/examPresets";

export const FULL_MOCK_TEST_1_ID = "cbt-jee-full-mock-test-1";

export const FULL_MOCK_TEST_1_RECORD: MockTestRecord = {
  id: FULL_MOCK_TEST_1_ID,
  title: "Full Mock Test 1",
  slug: "full-mock-test-1-jee-main-2027",
  seoDescription:
    "Attempt Full Mock Test 1 (JEE Main 2027 Full Syllabus) for Class 12 JEE & JEE Dropper on PREPSKM.IN — 75 cropped questions (Physics, Chemistry & Mathematics), 300 marks, 180 minutes, +4/-1 marking with exact step-by-step cropped solutions.",
  destination: "cbt-mock",
  cohortId: "class-12-jee",
  cohortIds: ["class-12-jee", "jee-dropper"],
  examCategory: "JEE Main 2027 Full Syllabus (NTA Pattern)",
  examType: "JEE Main",
  syllabus: [
    {
      subject: "Physics",
      chapters: [
        "Units, Dimensions & Errors",
        "Kinematics & Laws of Motion",
        "Work, Energy, Power & Rotational Motion",
        "Gravitation & Elasticity",
        "Thermodynamics, KTG & SHM",
        "Electrostatics, Capacitors & Current Electricity",
        "Magnetism, AC & EM Waves",
        "Ray & Wave Optics, Modern Physics & Semiconductors",
      ],
    },
    {
      subject: "Chemistry",
      chapters: [
        "Mole Concept, Atomic Structure & Chemical Bonding",
        "Thermodynamics, Equilibrium & Solutions",
        "Electrochemistry & Chemical Kinetics",
        "Periodic Properties, d- & f-Block & Coordination Compounds",
        "Alcohols, Phenols, Haloalkanes, Aldehydes, Amines & Biomolecules",
        "Redox Reactions & Practical Organic Chemistry",
      ],
    },
    {
      subject: "Mathematics",
      chapters: [
        "Relations, Functions, Complex Numbers & Quadratic Equations",
        "Matrices, Determinants, P&C, Binomial & Sequence-Series",
        "Limits, AOD, Indefinite & Definite Integration, Area & DE",
        "Circles, Ellipse & Hyperbola",
        "Vectors, 3D Geometry, Probability, Statistics & ITF",
      ],
    },
  ],
  instructions: getDefaultExamInstructions({
    examType: "JEE Main",
    durationMinutes: 180,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    totalQuestions: 75,
  }),
  subjectRanges: [
    { subjectName: "Physics", startQ: 1, endQ: 25 },
    { subjectName: "Chemistry", startQ: 26, endQ: 50 },
    { subjectName: "Mathematics", startQ: 51, endQ: 75 },
  ],
  totalQuestions: 75,
  totalMarks: 300,
  durationMinutes: 180,
  positiveMarks: 4,
  negativeMarks: 1,
  negativeMarkingEnabled: true,
  showSolutionsAfterSubmit: true,
  status: "published",
  createdAtIso: "2026-11-20T09:00:00.000Z",
};

export const FULL_MOCK_TEST_1_QUESTIONS: TestQuestionRecord[] = [
  {
    "id": "q-fmt1-01",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 1,
    "subjectName": "Physics",
    "chapterName": "Units, Dimensions & Errors",
    "questionType": "single-mcq",
    "questionText": "A physical quantity X is given by X = (A^2B^(1/2))/(C^(1/3)D^3). If the percentage errors in the measurement of A, B, C, and D are 1%, 2%, 3%, and 4% respectively, the maximum percentage error in X is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q01.png",
    "optionTexts": [
      "10%",
      "12%",
      "16%",
      "18%"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\nMaximum percentage error = 2(ΔA/A) + (1)/(2)(ΔB/B) + (1)/(3)(ΔC/C) + 3(ΔD/D)\n= 2(1%) + (1)/(2)(2%) + (1)/(3)(3%) + 3(4%) = 2 + 1 + 1 + 12 = 16%.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s01.png",
    "sourcePageNumber": 1,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-02",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 2,
    "subjectName": "Physics",
    "chapterName": "Kinematics",
    "questionType": "single-mcq",
    "questionText": "A projectile is launched from horizontal ground such that its horizontal range R is twice the maximum height H attained. If the initial speed is u, its speed at the highest point is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q02.png",
    "optionTexts": [
      "(u)/(√(5))",
      "(2u)/(√(5))",
      "(u)/(2)",
      "(u)/(√(2))"
    ],
    "correctOptionIndices": [
      0
    ],
    "solutionText": "Ans: (A)\nR = 4H cot θ ⇒ 2H = 4H cot θ ⇒ tan θ = 2.\nThus cos θ = (1)/(√(5)). Speed at highest point: v = u cos θ = (u)/(√(5)).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s02.png",
    "sourcePageNumber": 1,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-03",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 3,
    "subjectName": "Physics",
    "chapterName": "Laws of Motion",
    "questionType": "single-mcq",
    "questionText": "A block of mass 2 kg rests on a rough inclined plane making an angle of 37° with the horizontal (μ = 0.5). The minimum force parallel to the plane required to just move the block up the incline is (g = 10 m/s^2, sin 37° = 0.6):",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q03.png",
    "optionTexts": [
      "4 N",
      "12 N",
      "16 N",
      "20 N"
    ],
    "correctOptionIndices": [
      3
    ],
    "solutionText": "Ans: (D)\nF_min = mg sin 37° + μmg cos 37°\n= 2(10)(0.6) + 0.5(2)(10)(0.8) = 12 + 8 = 20 N.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s03.png",
    "sourcePageNumber": 1,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-04",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 4,
    "subjectName": "Physics",
    "chapterName": "Work, Energy & Power",
    "questionType": "single-mcq",
    "questionText": "An engine delivers constant power P to a particle of mass m starting from rest along a straight line. The distance s covered in time t is given by:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q04.png",
    "optionTexts": [
      "√((2P)/(m)) t^(3/2)",
      "√((8P)/(9m)) t^(3/2)",
      "√((9P)/(8m)) t^(3/2)",
      "(2P)/(3m) t^2"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nP = mv (dv)/(dt) ⇒ (v^2)/(2) = (Pt)/(m) ⇒ v = √((2P)/(m)) t^(1/2).\nIntegrating: s = (2)/(3)√((2P)/(m)) t^(3/2) = √((8P)/(9m)) t^(3/2).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s04.png",
    "sourcePageNumber": 1,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-05",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 5,
    "subjectName": "Physics",
    "chapterName": "Rotational Motion",
    "questionType": "single-mcq",
    "questionText": "A solid sphere rolls without slipping on a horizontal surface with linear speed v. The ratio of its rotational kinetic energy to its total kinetic energy is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q05.png",
    "optionTexts": [
      "2 : 5",
      "2 : 7",
      "5 : 7",
      "1 : 3"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nI = (2)/(5)mR^2 ⇒ K_rot = (1)/(2)Iω^2 = (1)/(5)mv^2.\nK_total = (1)/(2)mv^2 + (1)/(5)mv^2 = (7)/(10)mv^2 ⇒ Ratio = (1/5)/(7/10) = (2)/(7).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s05.png",
    "sourcePageNumber": 1,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-06",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 6,
    "subjectName": "Physics",
    "chapterName": "Gravitation",
    "questionType": "single-mcq",
    "questionText": "The escape velocity from the surface of Earth is 11.2 km/s. The escape velocity from the surface of a planet having twice the mass and half the radius of Earth is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q06.png",
    "optionTexts": [
      "11.2 km/s",
      "15.8 km/s",
      "22.4 km/s",
      "44.8 km/s"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\nv_e = √((2GM)/(R)). For the planet, v_p = √((2G(2M_e))/(R_e/2)) = 2v_e\n= 2 × 11.2 = 22.4 km/s.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s06.png",
    "sourcePageNumber": 2,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-07",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 7,
    "subjectName": "Physics",
    "chapterName": "Elasticity & Solids",
    "questionType": "single-mcq",
    "questionText": "A uniform wire of length L, radius r, and Young's modulus Y is stretched by a force F. The elastic potential energy stored per unit volume of the wire is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q07.png",
    "optionTexts": [
      "(F^2)/(2πr^2Y)",
      "(F^2)/(2π^2r^4Y)",
      "(F^2)/(π^2r^4Y)",
      "(F^2L)/(2πr^2Y)"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nEnergy density u = ((Stress)^2)/(2Y) = ((F/πr^2)^2)/(2Y) = (F^2)/(2π^2r^4Y).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s07.png",
    "sourcePageNumber": 2,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-08",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 8,
    "subjectName": "Physics",
    "chapterName": "Thermodynamics",
    "questionType": "single-mcq",
    "questionText": "A Carnot engine operates between a source at 600 K and a sink at 300 K. If it absorbs 1000 J of heat per cycle from the source, the net work done per cycle is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q08.png",
    "optionTexts": [
      "250 J",
      "400 J",
      "500 J",
      "750 J"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\nEfficiency η = 1 − (T_2)/(T_1) = 1 − (300)/(600) = 0.5.\nWork done W = ηQ_1 = 0.5 × 1000 = 500 J.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s08.png",
    "sourcePageNumber": 2,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-09",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 9,
    "subjectName": "Physics",
    "chapterName": "Kinetic Theory of Gases",
    "questionType": "single-mcq",
    "questionText": "The ratio of the root mean square (rms) speed of oxygen (O_2) molecules to that of hydrogen (H_2) molecules at the same temperature of 300 K is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q09.png",
    "optionTexts": [
      "1 : 4",
      "4 : 1",
      "1 : 16",
      "1 : 2"
    ],
    "correctOptionIndices": [
      0
    ],
    "solutionText": "Ans: (A)\nv_rms ∝ (1)/(√(M)) ⇒ (v_O2)/(v_H2) = √((M_H2)/(M_O2)) = √((2)/(32)) = (1)/(4).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s09.png",
    "sourcePageNumber": 2,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-10",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 10,
    "subjectName": "Physics",
    "chapterName": "Simple Harmonic Motion",
    "questionType": "single-mcq",
    "questionText": "A particle executes simple harmonic motion (SHM) with amplitude A. The displacement from the mean position at which its kinetic energy equals its potential energy is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q10.png",
    "optionTexts": [
      "±(A)/(2)",
      "±(A)/(√(2))",
      "±(A)/(4)",
      "±(√(3)A)/(2)"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nK = U ⇒ (1)/(2)k(A^2 − x^2) = (1)/(2)kx^2 ⇒ 2x^2 = A^2 ⇒ x = ±(A)/(√(2)).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s10.png",
    "sourcePageNumber": 2,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-11",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 11,
    "subjectName": "Physics",
    "chapterName": "Electrostatics",
    "questionType": "single-mcq",
    "questionText": "Two point charges +4q and −q are fixed at a separation d. A third charge placed on the line joining them experiences zero net electrostatic force at a distance:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q11.png",
    "optionTexts": [
      "d/3 from −q between them",
      "d from −q away from +4q",
      "d/2 from +4q",
      "2d from +4q"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nNull point lies outside near the smaller magnitude charge (−q).\n(k(4q))/((d + x)^2) = (kq)/(x^2) ⇒ (2)/(d + x) = (1)/(x) ⇒ x = d from −q.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s11.png",
    "sourcePageNumber": 3,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-12",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 12,
    "subjectName": "Physics",
    "chapterName": "Capacitors",
    "questionType": "single-mcq",
    "questionText": "A 10 μF parallel plate capacitor is charged to 100 V and then disconnected from the battery. A dielectric slab of dielectric constant K = 4 is then inserted to completely fill the space. The final energy stored is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q12.png",
    "optionTexts": [
      "12.5 mJ",
      "25 mJ",
      "50 mJ",
      "200 mJ"
    ],
    "correctOptionIndices": [
      0
    ],
    "solutionText": "Ans: (A)\nInitial energy U_i = (1)/(2)CV^2 = (1)/(2)(10 × 10^−6)(100)^2 = 50 mJ.\nBattery disconnected ⇒ Q constant ⇒ U_f = U_i/K = 50/4 = 12.5 mJ.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s12.png",
    "sourcePageNumber": 3,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-13",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 13,
    "subjectName": "Physics",
    "chapterName": "Current Electricity",
    "questionType": "single-mcq",
    "questionText": "A uniform metallic wire of resistance 16 Ω is stretched uniformly to double its original length without any change in volume. Its new resistance is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q13.png",
    "optionTexts": [
      "32 Ω",
      "64 Ω",
      "8 Ω",
      "128 Ω"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nVolume V = Al is constant. When l′ = 2l, A′ = A/2.\nR′ = ρ(2l)/(A/2) = 4R = 4 × 16 = 64 Ω.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s13.png",
    "sourcePageNumber": 3,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-14",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 14,
    "subjectName": "Physics",
    "chapterName": "Moving Charges & Magnetism",
    "questionType": "single-mcq",
    "questionText": "A proton and an α-particle enter a uniform magnetic field perpendicularly with the same kinetic energy. The ratio of the radii of their circular paths (r_p : r_α) is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q14.png",
    "optionTexts": [
      "1 : 2",
      "2 : 1",
      "1 : 1",
      "1 : 4"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\nr = (√(2mK))/(qB) ⇒ (r_p)/(r_α) = √((m_p)/(m_α)) · (q_α)/(q_p) = √((1)/(4)) · (2)/(1) = 1 : 1.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s14.png",
    "sourcePageNumber": 3,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-15",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 15,
    "subjectName": "Physics",
    "chapterName": "Alternating Current",
    "questionType": "single-mcq",
    "questionText": "In a series LCR circuit, R = 30 Ω, X_L = 80 Ω, and X_C = 40 Ω connected across a 200 V AC source. The power factor of the circuit is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q15.png",
    "optionTexts": [
      "0.5",
      "0.6",
      "0.8",
      "1.0"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nImpedance Z = √(R^2 + (X_L − X_C)^2) = √(30^2 + 40^2) = 50 Ω.\nPower factor cos φ = R/Z = 30/50 = 0.6.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s15.png",
    "sourcePageNumber": 3,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-16",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 16,
    "subjectName": "Physics",
    "chapterName": "Electromagnetic Waves",
    "questionType": "single-mcq",
    "questionText": "The electric field amplitude of a plane electromagnetic wave propagating in vacuum is E_0 = 60 V/m. The magnetic field amplitude B_0 is (c = 3 × 10^8 m/s):",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q16.png",
    "optionTexts": [
      "2 × 10^−7 T",
      "1.8 × 10^−7 T",
      "2 × 10^−8 T",
      "5 × 10^−7 T"
    ],
    "correctOptionIndices": [
      0
    ],
    "solutionText": "Ans: (A)\nB_0 = (E_0)/(c) = (60)/(3 × 10^8) = 2 × 10^−7 T.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s16.png",
    "sourcePageNumber": 4,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-17",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 17,
    "subjectName": "Physics",
    "chapterName": "Ray Optics",
    "questionType": "single-mcq",
    "questionText": "A convex lens of focal length 20 cm forms a real image twice the size of the object. The distance of the object from the lens is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q17.png",
    "optionTexts": [
      "10 cm",
      "20 cm",
      "30 cm",
      "40 cm"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\nFor a real magnified image, m = −2. Using m = (f)/(f + u):\n−2 = (20)/(20 + u) ⇒ −40 − 2u = 20 ⇒ u = −30 cm (distance = 30 cm).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s17.png",
    "sourcePageNumber": 4,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-18",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 18,
    "subjectName": "Physics",
    "chapterName": "Wave Optics",
    "questionType": "single-mcq",
    "questionText": "In Young's double slit experiment (YDSE), slit separation d = 1 mm, screen distance D = 1 m, and wavelength λ = 600 nm. The fringe width is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q18.png",
    "optionTexts": [
      "0.3 mm",
      "0.6 mm",
      "1.2 mm",
      "6.0 mm"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nFringe width β = (λD)/(d) = (600 × 10^−9 × 1)/(1 × 10^−3) = 6 × 10^−4 m = 0.6 mm.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s18.png",
    "sourcePageNumber": 4,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-19",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 19,
    "subjectName": "Physics",
    "chapterName": "Dual Nature of Matter",
    "questionType": "single-mcq",
    "questionText": "The de Broglie wavelength of an electron accelerated from rest through a potential difference of 100 V is approximately:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q19.png",
    "optionTexts": [
      "0.123 Å",
      "1.227 Å",
      "12.27 Å",
      "0.614 Å"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nλ = (12.27)/(√(V)) Å = (12.27)/(√(100)) Å = 1.227 Å.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s19.png",
    "sourcePageNumber": 4,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-20",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 20,
    "subjectName": "Physics",
    "chapterName": "Semiconductors & Logic Gates",
    "questionType": "single-mcq",
    "questionText": "The output of a two-input NAND gate is connected to the input of a NOT gate. The resulting combination acts as a:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q20.png",
    "optionTexts": [
      "OR gate",
      "NOR gate",
      "AND gate",
      "XOR gate"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\nNAND output is NOT(A · B). Passing through NOT gives Y = NOT(A · B) = A · B, which is an AND gate.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s20.png",
    "sourcePageNumber": 4,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-21",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 21,
    "subjectName": "Physics",
    "chapterName": "Rotational Motion",
    "questionType": "integer",
    "questionText": "A uniform circular disc of mass 2 kg and radius 0.5 m rotates about its central perpendicular axis at 20 rad/s. Find its rotational kinetic energy (in J).",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q21.png",
    "numericalAnswer": "50",
    "solutionText": "Ans: 50\nI = (1)/(2)mr^2 = (1)/(2)(2)(0.5)^2 = 0.25 kg m^2.\nK = (1)/(2)Iω^2 = (1)/(2)(0.25)(20)^2 = 50 J.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s21.png",
    "sourcePageNumber": 5,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-22",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 22,
    "subjectName": "Physics",
    "chapterName": "Current Electricity",
    "questionType": "integer",
    "questionText": "In a balanced Wheatstone bridge, three resistances are P = 10 Ω, Q = 20 Ω, and R = 15 Ω. Find the fourth resistance S (in Ω).",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q22.png",
    "numericalAnswer": "30",
    "solutionText": "Ans: 30\nBalance condition: (P)/(Q) = (R)/(S) ⇒ (10)/(20) = (15)/(S) ⇒ S = 30 Ω.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s22.png",
    "sourcePageNumber": 5,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-23",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 23,
    "subjectName": "Physics",
    "chapterName": "Thermodynamics & KTG",
    "questionType": "integer",
    "questionText": "2 moles of an ideal monoatomic gas are heated at constant volume from 300 K to 400 K. Find the heat supplied (in J). (Take R = 8.3 J mol^−1K^−1)",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q23.png",
    "numericalAnswer": "2490",
    "solutionText": "Ans: 2490\nQ_V = nC_VΔT = 2 × ((3)/(2)R) × (400 − 300) = 3 × 8.3 × 100 = 2490 J.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s23.png",
    "sourcePageNumber": 5,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-24",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 24,
    "subjectName": "Physics",
    "chapterName": "Nuclei & Radioactivity",
    "questionType": "integer",
    "questionText": "The half-life of a radioactive nuclide is 10 days. Find the time (in days) required for 75% of the initial sample to decay.",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q24.png",
    "numericalAnswer": "20",
    "solutionText": "Ans: 20\n75% decayed ⇒ 25% = (1)/(4) = ((1)/(2))^2 remains.\nNumber of half-lives n = 2 ⇒ t = 2 × 10 = 20 days.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s24.png",
    "sourcePageNumber": 5,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-25",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 25,
    "subjectName": "Physics",
    "chapterName": "Ray Optics",
    "questionType": "integer",
    "questionText": "An equilateral glass prism (A = 60°) has refractive index μ = √(2). Find the angle of minimum deviation δ_m (in degrees).",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q25.png",
    "numericalAnswer": "30",
    "solutionText": "Ans: 30\nμ = (sin((A + δ_m)/2))/(sin(A/2)) ⇒ √(2) = (sin((60° + δ_m)/2))/(sin 30°)\nsin((60° + δ_m)/(2)) = (1)/(√(2)) = sin 45° ⇒ δ_m = 30°.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s25.png",
    "sourcePageNumber": 5,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-26",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 26,
    "subjectName": "Chemistry",
    "chapterName": "Mole Concept",
    "questionType": "single-mcq",
    "questionText": "The mass of CO_2 produced by complete thermal decomposition of 50 g of 80% pure CaCO_3 is (Atomic masses: Ca = 40, C = 12, O = 16):",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q26.png",
    "optionTexts": [
      "8.8 g",
      "17.6 g",
      "22.0 g",
      "35.2 g"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nPure CaCO_3 = 0.80 × 50 = 40 g = (40)/(100) = 0.4 mol.\nCaCO_3 → CaO + CO_2 gives 0.4 mol CO_2 = 0.4 × 44 = 17.6 g.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s26.png",
    "sourcePageNumber": 6,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-27",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 27,
    "subjectName": "Chemistry",
    "chapterName": "Atomic Structure",
    "questionType": "single-mcq",
    "questionText": "The energy of an electron in the 2nd Bohr orbit of the He^+ ion is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q27.png",
    "optionTexts": [
      "−3.4 eV",
      "−13.6 eV",
      "−27.2 eV",
      "−54.4 eV"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nE_n = −13.6 × (Z^2)/(n^2) eV.\nFor He^+ (Z = 2, n = 2): E_2 = −13.6 × (4)/(4) = −13.6 eV.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s27.png",
    "sourcePageNumber": 6,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-28",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 28,
    "subjectName": "Chemistry",
    "chapterName": "Chemical Bonding",
    "questionType": "single-mcq",
    "questionText": "According to VSEPR theory, the hybridisation of Xenon and the molecular geometry of XeF_4 are respectively:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q28.png",
    "optionTexts": [
      "sp^3, tetrahedral",
      "dsp^2, square planar",
      "sp^3d^2, square planar",
      "sp^3d, see-saw"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\nXe has 8 valence electrons: 4 bond pairs + 2 lone pairs ⇒ steric number 6 (sp^3d^2).\nTwo lone pairs occupy axial sites ⇒ square planar shape.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s28.png",
    "sourcePageNumber": 6,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-29",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 29,
    "subjectName": "Chemistry",
    "chapterName": "Chemical Thermodynamics",
    "questionType": "single-mcq",
    "questionText": "For a reaction, ΔH = −40 kJ mol^−1 and ΔS = −100 J K^−1mol^−1. Assuming both are temperature independent, the reaction is spontaneous at:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q29.png",
    "optionTexts": [
      "T < 400 K",
      "T > 400 K",
      "T = 500 K",
      "All temperatures"
    ],
    "correctOptionIndices": [
      0
    ],
    "solutionText": "Ans: (A)\nFor spontaneity, ΔG = ΔH − TΔS < 0.\n−40000 − T(−100) < 0 ⇒ 100T < 40000 ⇒ T < 400 K.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s29.png",
    "sourcePageNumber": 6,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-30",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 30,
    "subjectName": "Chemistry",
    "chapterName": "Ionic Equilibrium",
    "questionType": "single-mcq",
    "questionText": "The pH of a 0.1 M aqueous solution of acetic acid (K_a = 1.0 × 10^−5) at 298 K is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q30.png",
    "optionTexts": [
      "1",
      "2",
      "3",
      "5"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\n[H^+] = √(K_a · C) = √(10^−5 × 0.1) = 10^−3 M.\npH = −log(10^−3) = 3.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s30.png",
    "sourcePageNumber": 6,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-31",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 31,
    "subjectName": "Chemistry",
    "chapterName": "Solutions",
    "questionType": "single-mcq",
    "questionText": "The relative lowering of vapour pressure when 18 g of glucose (M = 180) is dissolved in 178.2 g of water (M = 18) is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q31.png",
    "optionTexts": [
      "0.001",
      "0.01",
      "0.02",
      "0.1"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nn_2 = 18/180 = 0.1 mol; n_1 = 178.2/18 = 9.9 mol.\nΔP/P^(°) = χ_2 = 0.1/(0.1 + 9.9) = 0.1/10 = 0.01.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s31.png",
    "sourcePageNumber": 7,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-32",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 32,
    "subjectName": "Chemistry",
    "chapterName": "Electrochemistry",
    "questionType": "single-mcq",
    "questionText": "For the cell Zn(s)|Zn^2+(0.1 M)||Cu^2+(1.0 M)|Cu(s) at 298 K, given E^(°)_cell = 1.10 V and 2.303RT/F ≈ 0.06 V, the cell EMF is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q32.png",
    "optionTexts": [
      "1.07 V",
      "1.10 V",
      "1.13 V",
      "1.16 V"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\nE = E^(°) − (0.06)/(2) log ([Zn^2+])/([Cu^2+]) = 1.10 − 0.03 log(0.1/1.0)\n= 1.10 − 0.03(−1) = 1.13 V.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s32.png",
    "sourcePageNumber": 7,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-33",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 33,
    "subjectName": "Chemistry",
    "chapterName": "Chemical Kinetics",
    "questionType": "single-mcq",
    "questionText": "A first-order reaction is 75% completed in 40 minutes. Its half-life period (t_1/2) is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q33.png",
    "optionTexts": [
      "10 min",
      "20 min",
      "30 min",
      "40 min"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nFor first-order kinetics, t_75% = 2t_1/2.\nHence 2t_1/2 = 40 min ⇒ t_1/2 = 20 min.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s33.png",
    "sourcePageNumber": 7,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-34",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 34,
    "subjectName": "Chemistry",
    "chapterName": "Periodic Table & Properties",
    "questionType": "single-mcq",
    "questionText": "The correct increasing order of first ionisation enthalpy (Δ_iH_1) among B, C, N, and O is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q34.png",
    "optionTexts": [
      "B < C < N < O",
      "B < C < O < N",
      "C < B < O < N",
      "B < O < C < N"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nIonisation enthalpy increases across period 2, but N (2p^3, half-filled stable configuration) has higher Δ_iH_1 than O (2p^4): B < C < O < N.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s34.png",
    "sourcePageNumber": 7,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-35",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 35,
    "subjectName": "Chemistry",
    "chapterName": "d- and f-Block Elements",
    "questionType": "single-mcq",
    "questionText": "The spin-only magnetic moment of Mn^2+ ion (Z = 25) in Bohr Magnetons (BM) is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q35.png",
    "optionTexts": [
      "1.73 BM",
      "3.87 BM",
      "4.90 BM",
      "5.92 BM"
    ],
    "correctOptionIndices": [
      3
    ],
    "solutionText": "Ans: (D)\nMn^2+ has configuration [Ar] 3d^5 ⇒ n = 5 unpaired electrons.\nμ = √(n(n + 2)) = √(5(7)) = √(35) ≈ 5.92 BM.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s35.png",
    "sourcePageNumber": 7,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-36",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 36,
    "subjectName": "Chemistry",
    "chapterName": "Coordination Compounds",
    "questionType": "single-mcq",
    "questionText": "The IUPAC name of the coordination compound [Co(NH_3)_5Cl]Cl_2 is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q36.png",
    "optionTexts": [
      "Pentaamminechloridocobalt(II) chloride",
      "Pentaamminechloridocobalt(III) chloride",
      "Pentamminecobalt(III) trichloride",
      "Chloridopentaamminecobalt(III) chloride"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nOxidation state of Co: x + 5(0) + (−1) = +2 ⇒ x = +3. Ligands alphabetically: ammine before chlorido ⇒ Pentaamminechloridocobalt(III) chloride.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s36.png",
    "sourcePageNumber": 8,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-37",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 37,
    "subjectName": "Chemistry",
    "chapterName": "Alcohols, Phenols & Ethers",
    "questionType": "single-mcq",
    "questionText": "Which of the following is the strongest acid?",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q37.png",
    "optionTexts": [
      "Ethanol",
      "Phenol",
      "p-Methylphenol",
      "p-Nitrophenol"
    ],
    "correctOptionIndices": [
      3
    ],
    "solutionText": "Ans: (D)\nThe −NO_2 group at the para position exerts strong −M and −I effects, strongly stabilising the phenoxide conjugate base.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s37.png",
    "sourcePageNumber": 8,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-38",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 38,
    "subjectName": "Chemistry",
    "chapterName": "Haloalkanes & Haloarenes",
    "questionType": "single-mcq",
    "questionText": "Heating 2-bromobutane with alcoholic KOH predominantly yields:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q38.png",
    "optionTexts": [
      "But-1-ene",
      "But-2-ene",
      "Butan-2-ol",
      "But-1-yne"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nAlcoholic KOH promotes E2 dehydrohalogenation following Zaitsev's rule, forming the more substituted alkene But-2-ene as major product.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s38.png",
    "sourcePageNumber": 8,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-39",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 39,
    "subjectName": "Chemistry",
    "chapterName": "Aldehydes, Ketones & Acids",
    "questionType": "single-mcq",
    "questionText": "Which of the following aldehydes gives a yellow precipitate upon warming with I_2 and aqueous NaOH (iodoform test)?",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q39.png",
    "optionTexts": [
      "HCHO",
      "CH_3CHO",
      "CH_3CH_2CHO",
      "C_6H_5CHO"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nIodoform test requires a CH_3C(=O)− group. Only acetaldehyde (CH_3CHO) possesses this group among aldehydes.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s39.png",
    "sourcePageNumber": 8,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-40",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 40,
    "subjectName": "Chemistry",
    "chapterName": "Biomolecules",
    "questionType": "single-mcq",
    "questionText": "Which of the following carbohydrates is a non-reducing sugar?",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q40.png",
    "optionTexts": [
      "Glucose",
      "Maltose",
      "Lactose",
      "Sucrose"
    ],
    "correctOptionIndices": [
      3
    ],
    "solutionText": "Ans: (D)\nIn sucrose, the glycosidic linkage connects C1 of α-D-glucose and C2 of β-D-fructose, leaving no free hemiacetal/hemiketal group.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s40.png",
    "sourcePageNumber": 8,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-41",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 41,
    "subjectName": "Chemistry",
    "chapterName": "Redox Reactions",
    "questionType": "single-mcq",
    "questionText": "The oxidation states of chromium in K_2Cr_2O_7 and CrO_5 are respectively:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q41.png",
    "optionTexts": [
      "+6 and +10",
      "+6 and +6",
      "+7 and +6",
      "+3 and +6"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nIn K_2Cr_2O_7, Cr is +6. In CrO_5 (butterfly structure), two peroxo (−O−O−) linkages exist: x + 4(−1) + (−2) = 0 ⇒ +6.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s41.png",
    "sourcePageNumber": 9,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-42",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 42,
    "subjectName": "Chemistry",
    "chapterName": "d- and f-Block Elements",
    "questionType": "single-mcq",
    "questionText": "Which of the following transition metal ions is colourless in aqueous solution?",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q42.png",
    "optionTexts": [
      "Ti^4+",
      "V^3+",
      "Cr^3+",
      "Fe^2+"
    ],
    "correctOptionIndices": [
      0
    ],
    "solutionText": "Ans: (A)\nTi^4+ has a 3d^0 configuration with zero unpaired electrons; hence no d−d transitions occur and it is colourless.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s42.png",
    "sourcePageNumber": 9,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-43",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 43,
    "subjectName": "Chemistry",
    "chapterName": "Amines",
    "questionType": "single-mcq",
    "questionText": "Gabriel phthalimide synthesis is specifically used for the preparation of:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q43.png",
    "optionTexts": [
      "Primary aromatic amines",
      "Secondary aliphatic amines",
      "Primary aliphatic amines",
      "Tertiary aliphatic amines"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\nPhthalimide anion undergoes S_N2 with alkyl halides (not aryl halides) to cleanly yield primary aliphatic amines.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s43.png",
    "sourcePageNumber": 9,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-44",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 44,
    "subjectName": "Chemistry",
    "chapterName": "Alcohols, Phenols & Ethers",
    "questionType": "single-mcq",
    "questionText": "Treatment of phenol with CHCl_3 and aqueous NaOH at 340 K followed by acidification yields:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q44.png",
    "optionTexts": [
      "Salicylic acid",
      "Salicylaldehyde",
      "Benzoic acid",
      "Picric acid"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nThis is the Reimer–Tiemann reaction, introducing a −CHO group predominantly at the ortho position to give salicylaldehyde.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s44.png",
    "sourcePageNumber": 9,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-45",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 45,
    "subjectName": "Chemistry",
    "chapterName": "Practical Organic Chemistry",
    "questionType": "single-mcq",
    "questionText": "In Lassaigne's test for nitrogen in an organic compound, the Prussian blue colour is due to the formation of:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q45.png",
    "optionTexts": [
      "Na_4[Fe(CN)_6]",
      "Fe_4[Fe(CN)_6]_3",
      "Fe_3[Fe(CN)_6]_2",
      "Fe(SCN)_3"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nSodium ferrocyanide reacts with Fe^3+ ions to produce ferric ferrocyanide, Fe_4[Fe(CN)_6]_3 (Prussian blue).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s45.png",
    "sourcePageNumber": 9,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-46",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 46,
    "subjectName": "Chemistry",
    "chapterName": "Mole Concept & Volumetric Analysis",
    "questionType": "integer",
    "questionText": "Find the volume (in mL) of 0.5 M H_2SO_4 required to completely neutralise 50 mL of 1.0 M NaOH solution.",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q46.png",
    "numericalAnswer": "50",
    "solutionText": "Ans: 50\nN_1V_1 = N_2V_2. For H_2SO_4, N_1 = 2 × 0.5 = 1.0 N; for NaOH, N_2 = 1.0 N.\n1.0 × V_1 = 1.0 × 50 ⇒ V_1 = 50 mL.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s46.png",
    "sourcePageNumber": 10,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-47",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 47,
    "subjectName": "Chemistry",
    "chapterName": "Chemical Thermodynamics",
    "questionType": "integer",
    "questionText": "The standard internal energy change ΔU^(°) for combustion of 1 mole of CH_4(g) at 300 K is −885 kJ mol^−1. Find the magnitude of ΔH^(°) (in kJ mol^−1, rounded to nearest integer). (R = 8.3 J K^−1mol^−1)",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q47.png",
    "numericalAnswer": "890",
    "solutionText": "Ans: 890\nCH_4(g) + 2O_2(g) → CO_2(g) + 2H_2O(l) ⇒ Δn_g = 1 − 3 = −2.\nΔH^(°) = −885 + (−2)(8.3 × 10^−3)(300) = −889.98 ≈ 890 (magnitude).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s47.png",
    "sourcePageNumber": 10,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-48",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 48,
    "subjectName": "Chemistry",
    "chapterName": "Chemical Equilibrium",
    "questionType": "integer",
    "questionText": "For A(g) ⇌ 2B(g), K_c = 4 mol L^−1. Starting with 2 moles of A in a 1 L vessel, find the equilibrium concentration of B (in mol L^−1).",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q48.png",
    "numericalAnswer": "2",
    "solutionText": "Ans: 2\nAt eq.: [A] = 2 − x, [B] = 2x. K_c = ((2x)^2)/(2 − x) = 4\n⇒ x^2 + x − 2 = 0 ⇒ x = 1 ⇒ [B]_eq = 2x = 2.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s48.png",
    "sourcePageNumber": 10,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-49",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 49,
    "subjectName": "Chemistry",
    "chapterName": "Coordination Compounds",
    "questionType": "integer",
    "questionText": "Find the total number of geometrical isomers possible for the square planar complex [Pt(NH_3)_2Cl_2].",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q49.png",
    "numericalAnswer": "2",
    "solutionText": "Ans: 2\nSquare planar [Ma_2b_2] exhibits exactly 2 geometrical isomers: cis-platin and trans-platin.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s49.png",
    "sourcePageNumber": 10,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-50",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 50,
    "subjectName": "Chemistry",
    "chapterName": "IUPAC & Isomerism",
    "questionType": "integer",
    "questionText": "Find the total number of structural isomers with molecular formula C_4H_10O containing an alcoholic (−OH) functional group.",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q50.png",
    "numericalAnswer": "4",
    "solutionText": "Ans: 4\nThe 4 alcoholic isomers are: Butan-1-ol, Butan-2-ol, 2-Methylpropan-1-ol, and 2-Methylpropan-2-ol.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s50.png",
    "sourcePageNumber": 10,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-51",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 51,
    "subjectName": "Mathematics",
    "chapterName": "Relations & Functions",
    "questionType": "single-mcq",
    "questionText": "The domain of the real-valued function f(x) = √(9 − x^2) + (1)/(ln(x − 1)) is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q51.png",
    "optionTexts": [
      "(1, 3]",
      "(1, 2) ∪ (2, 3]",
      "[−3, 3]",
      "(1, 2) ∪ (2, 3)"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\n9 − x^2 ≥ 0 ⇒ x ∈ [−3, 3].\nAlso x − 1 > 0 ⇒ x > 1, and ln(x − 1) ≠ 0 ⇒ x ≠ 2.\nIntersection: (1, 2) ∪ (2, 3].",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s51.png",
    "sourcePageNumber": 11,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-52",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 52,
    "subjectName": "Mathematics",
    "chapterName": "Complex Numbers",
    "questionType": "single-mcq",
    "questionText": "The modulus of the complex number z = ((1 + i)^3)/((1 − i)^2) is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q52.png",
    "optionTexts": [
      "1",
      "√(2)",
      "2",
      "2√(2)"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\n|z| = (|1 + i|^3)/(|1 − i|^2) = ((√(2))^3)/((√(2))^2) = √(2).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s52.png",
    "sourcePageNumber": 11,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-53",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 53,
    "subjectName": "Mathematics",
    "chapterName": "Quadratic Equations",
    "questionType": "single-mcq",
    "questionText": "If α and β are the roots of x^2 − 5x + 6 = 0, then the value of α^3 + β^3 is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q53.png",
    "optionTexts": [
      "25",
      "35",
      "65",
      "125"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nα + β = 5, αβ = 6.\nα^3 + β^3 = (α + β)^3 − 3αβ(α + β) = 125 − 3(6)(5) = 35.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s53.png",
    "sourcePageNumber": 11,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-54",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 54,
    "subjectName": "Mathematics",
    "chapterName": "Matrices & Determinants",
    "questionType": "single-mcq",
    "questionText": "If A is a 3 × 3 matrix with |A| = 4, then the value of |adj(2A)| is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q54.png",
    "optionTexts": [
      "64",
      "256",
      "512",
      "1024"
    ],
    "correctOptionIndices": [
      3
    ],
    "solutionText": "Ans: (D)\n|2A| = 2^3|A| = 8 × 4 = 32.\n|adj(2A)| = |2A|^3−1 = 32^2 = 1024.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s54.png",
    "sourcePageNumber": 11,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-55",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 55,
    "subjectName": "Mathematics",
    "chapterName": "Permutations & Combinations",
    "questionType": "single-mcq",
    "questionText": "The number of distinct arrangements of all the letters of the word LEADER is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q55.png",
    "optionTexts": [
      "180",
      "360",
      "720",
      "120"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\n6 letters with 'E' repeated twice: (6!)/(2!) = (720)/(2) = 360.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s55.png",
    "sourcePageNumber": 11,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-56",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 56,
    "subjectName": "Mathematics",
    "chapterName": "Binomial Theorem",
    "questionType": "single-mcq",
    "questionText": "The coefficient of x^3 in the binomial expansion of (2x − (1)/(x))^7 is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q56.png",
    "optionTexts": [
      "336",
      "−672",
      "672",
      "448"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\nT_r+1 = ^7C_r(2x)^7−r(−x^−1)^r. Set 7 − 2r = 3 ⇒ r = 2.\nCoeff = ^7C_2(2^5)(−1)^2 = 21 × 32 = 672.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s56.png",
    "sourcePageNumber": 12,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-57",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 57,
    "subjectName": "Mathematics",
    "chapterName": "Sequence & Series",
    "questionType": "single-mcq",
    "questionText": "The sum of an infinite geometric progression is 15 and the sum of the squares of its terms is 45. The first term of the series is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q57.png",
    "optionTexts": [
      "3",
      "5",
      "6",
      "10"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\n(a)/(1 − r) = 15 and (a^2)/(1 − r^2) = 45. Dividing: (a)/(1 + r) = 3.\nHence (1 + r)/(1 − r) = 5 ⇒ r = (2)/(3) ⇒ a = 15(1 − (2)/(3)) = 5.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s57.png",
    "sourcePageNumber": 12,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-58",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 58,
    "subjectName": "Mathematics",
    "chapterName": "Limits & Continuity",
    "questionType": "single-mcq",
    "questionText": "The value of lim(x→0) (1 − cos 2x)/(x^2) is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q58.png",
    "optionTexts": [
      "0",
      "1",
      "2",
      "4"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\nlim(x→0) (2 sin^2 x)/(x^2) = 2(lim(x→0) (sin x)/(x))^2 = 2(1)^2 = 2.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s58.png",
    "sourcePageNumber": 12,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-59",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 59,
    "subjectName": "Mathematics",
    "chapterName": "Application of Derivatives",
    "questionType": "single-mcq",
    "questionText": "The absolute minimum value of f(x) = x^3 − 3x + 5 on the closed interval [0, 3] is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q59.png",
    "optionTexts": [
      "1",
      "3",
      "5",
      "23"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nf′(x) = 3x^2 − 3 = 0 ⇒ x = 1 ∈ [0, 3].\nf(0) = 5, f(1) = 3, f(3) = 23 ⇒ Minimum = 3.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s59.png",
    "sourcePageNumber": 12,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-60",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 60,
    "subjectName": "Mathematics",
    "chapterName": "Indefinite Integration",
    "questionType": "single-mcq",
    "questionText": "The indefinite integral ∫ (e^x(1 + x))/(cos^2(xe^x)) dx equals:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q60.png",
    "optionTexts": [
      "tan(xe^x) + C",
      "cot(xe^x) + C",
      "−tan(xe^x) + C",
      "sec(xe^x) + C"
    ],
    "correctOptionIndices": [
      0
    ],
    "solutionText": "Ans: (A)\nLet t = xe^x ⇒ dt = e^x(1 + x) dx.\nI = ∫ sec^2t dt = tan t + C = tan(xe^x) + C.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s60.png",
    "sourcePageNumber": 12,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-61",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 61,
    "subjectName": "Mathematics",
    "chapterName": "Definite Integration",
    "questionType": "single-mcq",
    "questionText": "The value of the definite integral ∫[0 to π/2] (sin x)/(sin x + cos x) dx is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q61.png",
    "optionTexts": [
      "(π)/(2)",
      "(π)/(4)",
      "(π)/(8)",
      "π"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nUsing King's property (x → π/2 − x): I = ∫[0 to π/2] (cos x)/(cos x + sin x) dx.\nAdding: 2I = ∫[0 to π/2] 1 dx = (π)/(2) ⇒ I = (π)/(4).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s61.png",
    "sourcePageNumber": 13,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-62",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 62,
    "subjectName": "Mathematics",
    "chapterName": "Area Under Curves",
    "questionType": "single-mcq",
    "questionText": "The area of the region bounded by the parabola y = x^2 and the straight line y = x is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q62.png",
    "optionTexts": [
      "(1)/(2)",
      "(1)/(3)",
      "(1)/(6)",
      "(2)/(3)"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\nIntersection at x = 0, 1.\nArea = ∫[0 to 1] (x − x^2) dx = [(x^2)/(2) − (x^3)/(3)]_0^1 = (1)/(2) − (1)/(3) = (1)/(6).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s62.png",
    "sourcePageNumber": 13,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-63",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 63,
    "subjectName": "Mathematics",
    "chapterName": "Differential Equations",
    "questionType": "single-mcq",
    "questionText": "The integrating factor of the linear differential equation (dy)/(dx) + (y)/(x) = x^2 (x > 0) is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q63.png",
    "optionTexts": [
      "x",
      "x^2",
      "e^x",
      "ln x"
    ],
    "correctOptionIndices": [
      0
    ],
    "solutionText": "Ans: (A)\nHere P(x) = (1)/(x).\nI.F. = e^(∫ (1/x) dx) = e^(ln x) = x.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s63.png",
    "sourcePageNumber": 13,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-64",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 64,
    "subjectName": "Mathematics",
    "chapterName": "Circles",
    "questionType": "single-mcq",
    "questionText": "The radius of the circle given by x^2 + y^2 − 4x + 6y − 3 = 0 is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q64.png",
    "optionTexts": [
      "2",
      "3",
      "4",
      "5"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\ng = −2, f = 3, c = −3.\nr = √(g^2 + f^2 − c) = √((−2)^2 + 3^2 − (−3)) = √(16) = 4.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s64.png",
    "sourcePageNumber": 13,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-65",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 65,
    "subjectName": "Mathematics",
    "chapterName": "Ellipse",
    "questionType": "single-mcq",
    "questionText": "The eccentricity of the ellipse 9x^2 + 25y^2 = 225 is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q65.png",
    "optionTexts": [
      "(3)/(5)",
      "(4)/(5)",
      "(3)/(4)",
      "(5)/(4)"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nStandard form: (x^2)/(25) + (y^2)/(9) = 1 ⇒ a^2 = 25, b^2 = 9.\ne = √(1 − (9)/(25)) = √((16)/(25)) = (4)/(5).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s65.png",
    "sourcePageNumber": 13,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-66",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 66,
    "subjectName": "Mathematics",
    "chapterName": "Vector Algebra",
    "questionType": "single-mcq",
    "questionText": "If |a⃗| = 3, |b⃗| = 4, and |a⃗ + b⃗| = 5, then the value of |a⃗ − b⃗| is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q66.png",
    "optionTexts": [
      "3",
      "4",
      "5",
      "7"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\nParallelogram law: |a⃗ + b⃗|^2 + |a⃗ − b⃗|^2 = 2(|a⃗|^2 + |b⃗|^2).\n5^2 + |a⃗ − b⃗|^2 = 2(9 + 16) = 50 ⇒ |a⃗ − b⃗| = 5.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s66.png",
    "sourcePageNumber": 14,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-67",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 67,
    "subjectName": "Mathematics",
    "chapterName": "3D Geometry",
    "questionType": "single-mcq",
    "questionText": "The angle between the lines (x − 1)/(2) = (y − 2)/(1) = (z + 1)/(−2) and (x + 2)/(1) = (y − 1)/(2) = (z)/(2) is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q67.png",
    "optionTexts": [
      "(π)/(6)",
      "(π)/(4)",
      "(π)/(3)",
      "(π)/(2)"
    ],
    "correctOptionIndices": [
      3
    ],
    "solutionText": "Ans: (D)\nDirection ratios: d⃗_1 = (2, 1, −2), d⃗_2 = (1, 2, 2).\nd⃗_1 · d⃗_2 = 2(1) + 1(2) + (−2)(2) = 0 ⇒ θ = (π)/(2).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s67.png",
    "sourcePageNumber": 14,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-68",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 68,
    "subjectName": "Mathematics",
    "chapterName": "Probability",
    "questionType": "single-mcq",
    "questionText": "Two fair six-sided dice are thrown simultaneously. The probability that the sum of the numbers obtained is 8 is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q68.png",
    "optionTexts": [
      "(1)/(9)",
      "(5)/(36)",
      "(1)/(6)",
      "(7)/(36)"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nFavourable pairs: (2,6), (3,5), (4,4), (5,3), (6,2) ⇒ 5 outcomes.\nTotal = 36 ⇒ Probability = (5)/(36).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s68.png",
    "sourcePageNumber": 14,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-69",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 69,
    "subjectName": "Mathematics",
    "chapterName": "Statistics",
    "questionType": "single-mcq",
    "questionText": "The variance of the first five natural numbers 1, 2, 3, 4, 5 is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q69.png",
    "optionTexts": [
      "1",
      "2",
      "3",
      "4"
    ],
    "correctOptionIndices": [
      1
    ],
    "solutionText": "Ans: (B)\nVariance of first n natural numbers = (n^2 − 1)/(12).\nFor n = 5: σ^2 = (25 − 1)/(12) = 2.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s69.png",
    "sourcePageNumber": 14,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-70",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 70,
    "subjectName": "Mathematics",
    "chapterName": "Inverse Trigonometric Functions",
    "questionType": "single-mcq",
    "questionText": "The principal value of tan^−1(1) + cos^−1(−(1)/(2)) + sin^−1(−(1)/(2)) is:",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q70.png",
    "optionTexts": [
      "(π)/(2)",
      "(2π)/(3)",
      "(3π)/(4)",
      "π"
    ],
    "correctOptionIndices": [
      2
    ],
    "solutionText": "Ans: (C)\n= (π)/(4) + ((2π)/(3)) + (−(π)/(6)) = (3π + 8π − 2π)/(12) = (9π)/(12) = (3π)/(4).",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s70.png",
    "sourcePageNumber": 14,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-71",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 71,
    "subjectName": "Mathematics",
    "chapterName": "Sequence & Series",
    "questionType": "integer",
    "questionText": "In an arithmetic progression (AP), the 3rd term is 7 and the 7th term is 15. Find the sum of the first 10 terms.",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q71.png",
    "numericalAnswer": "120",
    "solutionText": "Ans: 120\na + 2d = 7, a + 6d = 15 ⇒ d = 2, a = 3.\nS_10 = (10)/(2)[2(3) + 9(2)] = 5(24) = 120.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s71.png",
    "sourcePageNumber": 15,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-72",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 72,
    "subjectName": "Mathematics",
    "chapterName": "Permutations & Combinations",
    "questionType": "integer",
    "questionText": "Find the total number of 3-digit even numbers that can be formed from the digits 1, 2, 3, 4, 5 without repetition.",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q72.png",
    "numericalAnswer": "24",
    "solutionText": "Ans: 24\nUnits digit must be 2 or 4 (2 choices). Remaining 2 places from 4 digits: 4 × 3 = 12.\nTotal = 12 × 2 = 24.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s72.png",
    "sourcePageNumber": 15,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-73",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 73,
    "subjectName": "Mathematics",
    "chapterName": "Definite Integration",
    "questionType": "integer",
    "questionText": "Evaluate the definite integral ∫[−2 to 2] |x| dx.",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q73.png",
    "numericalAnswer": "4",
    "solutionText": "Ans: 4\n|x| is an even function ⇒ 2∫[0 to 2] x dx = 2[(x^2)/(2)]_0^2 = 2(2) = 4.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s73.png",
    "sourcePageNumber": 15,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-74",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 74,
    "subjectName": "Mathematics",
    "chapterName": "Hyperbola",
    "questionType": "integer",
    "questionText": "Find the length of the latus rectum of the hyperbola (x^2)/(9) − (y^2)/(36) = 1.",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q74.png",
    "numericalAnswer": "24",
    "solutionText": "Ans: 24\nHere a^2 = 9 ⇒ a = 3, and b^2 = 36.\nLatus rectum = (2b^2)/(a) = (2(36))/(3) = 24.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s74.png",
    "sourcePageNumber": 15,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  },
  {
    "id": "q-fmt1-75",
    "testId": "cbt-jee-full-mock-test-1",
    "questionNumber": 75,
    "subjectName": "Mathematics",
    "chapterName": "Vector Algebra",
    "questionType": "integer",
    "questionText": "If a⃗ = î + 2ĵ, b⃗ = 3ĵ + 4k̂, and c⃗ = î + k̂, find the scalar triple product [a⃗ b⃗ c⃗].",
    "questionImageUrl": "/assets/mocks/full-mock-test-1/q75.png",
    "numericalAnswer": "11",
    "solutionText": "Ans: 11\n[a⃗ b⃗ c⃗] = 120034101 = 1(3 − 0) − 2(0 − 4) + 0 = 3 + 8 = 11.",
    "solutionImageUrl": "/assets/mocks/full-mock-test-1/s75.png",
    "sourcePageNumber": 15,
    "positiveMarks": 4,
    "negativeMarks": 1,
    "testStatus": "published"
  }
];
