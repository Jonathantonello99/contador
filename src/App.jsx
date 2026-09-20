import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const CV_URL = "https://docs.opencv.org/4.x/opencv.js";

const ROI_MARGIN = 0.04;

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);

  if (!sorted.length) {
    return 0;
  }

  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const mean = (values) => {
  if (!values.length) {
    return 0;
  }

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
};

const standardDeviation = (values) => {
  if (values.length < 2) {
    return 0;
  }

  const average = mean(values);

  return Math.sqrt(
    values.reduce(
      (sum, value) =>
        sum + Math.pow(value - average, 2),
      0
    ) /
      (values.length - 1)
  );
};

export default function App() {
  /*
   * ==========================================================
   * REFS
   * ==========================================================
   */

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const workCanvasRef = useRef(null);

  const streamRef = useRef(null);

  const backgroundRef = useRef(null);
  const grainProfileRef = useRef(null);

  const countHistoryRef = useRef([]);

  const animationFrameRef = useRef(null);
  const lastProcessingTimeRef = useRef(0);

  /*
   * ==========================================================
   * ESTADOS
   * ==========================================================
   */

  const [openCvReady, setOpenCvReady] =
    useState(false);

  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState("");

  const [count, setCount] = useState(0);

  const [status, setStatus] = useState(
    "Carregando OpenCV..."
  );

  const [warning, setWarning] = useState("");

  const [backgroundCalibrated, setBackgroundCalibrated] =
    useState(false);

  const [grainProfile, setGrainProfile] =
    useState(null);

  const [calibrating, setCalibrating] =
    useState(false);

  const [threshold, setThreshold] = useState(30);
  const [minArea, setMinArea] = useState(20);

  const [running, setRunning] = useState(true);

  const [showOverlay, setShowOverlay] =
    useState(true);

  const [debugMode, setDebugMode] =
    useState(false);

  const [averageArea, setAverageArea] =
    useState(0);

  const [averageDiameter, setAverageDiameter] =
    useState
