"use client";
import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { QRCodeCanvas } from "qrcode.react";
import { FaAndroid, FaRocket, FaCheckCircle, FaDownload, FaCog, FaChevronDown, FaExclamationCircle } from "react-icons/fa";

export default function Home() {
    const [url, setUrl] = useState("");
    const [appName, setAppName] = useState("");
    const [logoFile, setLogoFile] = useState(null);
    const [urlError, setUrlError] = useState(""); 

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [packageName, setPackageName] = useState("com.mycompany.app");
    const [version, setVersion] = useState("1.0.0");
    const [splashColor, setSplashColor] = useState("#FFFFFF");

    const [status, setStatus] = useState("idle"); 
    const [logs, setLogs] = useState([]);
    const [downloadUrl, setDownloadUrl] = useState("");

    // ================== আপনার তথ্য বসান ==================
    const IMGBB_API_KEY = "a3b7f162039d6ecfb5980f08165110a6"; // এখানে Key দিন
    const GITHUB_USERNAME = "mrbadstudent48-dev"; // যেমন: mrbadstudent48-dev
    const REPO_NAME = "apk-maker"; 
    // ====================================================

    const terminalEndRef = useRef(null);
    useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
    const pushLog = (msg) => setLogs((prev) => [...prev, `> ${msg}`]);

    const validateURL = (input) => {
        let cleanUrl = input.trim();
        if (!cleanUrl) return false;
        if (!/^https?:\/\//i.test(cleanUrl)) {
            cleanUrl = "https://" + cleanUrl;
            setUrl(cleanUrl);
        }
        const urlPattern = new RegExp('^(https?:\\/\\/)?'+ 
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ 
            '((\\d{1,3}\\.){3}\\d{1,3}))'+ 
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ 
            '(\\?[;&a-z\\d%_.~+=-]*)?'+ 
            '(\\#[-a-z\\d_]*)?$','i');
        return urlPattern.test(cleanUrl) ? cleanUrl : false;
    };

    const startProcess = async () => {
        setUrlError("");
        const finalUrl = validateURL(url);
        if (!finalUrl) {
            setUrlError("Please enter a valid website format.");
            return;
        }
        if (!appName || !logoFile) return alert("Fill all fields!");

        setStatus("building");
        setLogs(["> Analyzing target URL..."]);

        try {
            pushLog("[INFO] Verifying if the website is currently LIVE...");
            const checkRes = await fetch("/api/github", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "check_url", payload: { url: finalUrl } })
            });
            const checkData = await checkRes.json();
            
            if (!checkData.live) {
                setUrlError("This website is down, unreachable, or doesn't exist!");
                setStatus("idle");
                return;
            }
            
            pushLog("[SUCCESS] Website is alive and responding!");

            pushLog("[INFO] Uploading App Logo to Cloud...");
            const formData = new FormData();
            formData.append("image", logoFile);
            const imgRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
            const imgData = await imgRes.json();
            if (!imgData.success) throw new Error("Logo upload failed! Check API Key.");

            pushLog("[INFO] Triggering Build Engine...");
            const triggerRes = await fetch("/api/github", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "start_build",
                    payload: { url: finalUrl, app_name: appName, icon_url: imgData.data.url, package_name: packageName, version, splash_color: splashColor }
                })
            });

            if (!triggerRes.ok) throw new Error("Server communication failed.");

            pushLog("[INFO] Waiting for GitHub Actions runner...");
            setTimeout(fetchRunId, 10000);
        } catch (err) {
            pushLog(`[ERROR] ${err.message}`);
            setStatus("error"); // এখন আর গায়েব হবে না!
        }
    };

    const fetchRunId = async () => {
        try {
            const res = await fetch("/api/github", { method: "POST", body: JSON.stringify({ action: "get_run_id" }) });
            const data = await res.json();
            if (data.workflow_runs?.length > 0) {
                checkStatus(data.workflow_runs[0].id);
            } else {
                setTimeout(fetchRunId, 5000);
            }
        } catch (err) {
            pushLog(`[ERROR] ${err.message}`);
            setStatus("error");
        }
    };

    const checkStatus = (id) => {
        const timer = setInterval(async () => {
            const res = await fetch("/api/github", { method: "POST", body: JSON.stringify({ action: "check_status", runId: id }) });
            const data = await res.json();

            if (data.status === "in_progress") {
                 pushLog("Compiling Gradle and aligning APK... (Please wait)");
            } else if (data.status === "completed") {
                clearInterval(timer);
                if (data.conclusion === "success") {
                    pushLog("[SUCCESS] Build successful!");
                    finishBuild(id);
                } else {
                    pushLog("[ERROR] Build failed on server.");
                    setStatus("error");
                }
            }
        }, 15000);
    };

    const finishBuild = (id) => {
        let safeAppName = appName.replace(/[^A-Za-z0-9_-]/g, "");
        if (!safeAppName) safeAppName = "App";
        const apkUrl = `https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/releases/download/v${id}/${safeAppName}.apk`;
        setDownloadUrl(apkUrl);
        setStatus("success");
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4 font-sans text-black">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md transition-all">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
                        <FaAndroid className="text-green-500" /> App Maker Pro
                    </h2>
                    <p className="text-gray-500 text-sm">Convert Any Website to Professional App</p>
                </div>

                {status === "idle" && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Website URL</label>
                            <input type="url" value={url} onChange={(e) => { setUrl(e.target.value); setUrlError(""); }} className={`w-full px-4 py-2 border rounded-lg outline-none transition ${urlError ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`} placeholder="example.com" />
                            {urlError && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><FaExclamationCircle /> {urlError}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">App Name</label>
                            <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" placeholder="My Website" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">App Icon</label>
                            <input type="file" accept="image/png, image/jpeg" onChange={(e) => setLogoFile(e.target.files[0])} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>

                        <div className="border border-gray-200 rounded-lg overflow-hidden mt-4">
                            <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between text-sm font-bold text-gray-700 hover:bg-gray-100 transition">
                                <span className="flex items-center gap-2"><FaCog className="text-indigo-500"/> Advanced Settings</span>
                                <FaChevronDown className={`transition-transform duration-300 ${showAdvanced ? "rotate-180" : ""}`} />
                            </button>
                            {showAdvanced && (
                                <div className="p-4 bg-gray-50 space-y-3 border-t">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600">Package Name</label>
                                        <input type="text" value={packageName} onChange={(e) => setPackageName(e.target.value)} className="w-full px-3 py-1.5 border rounded text-sm mt-1" />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-1/2">
                                            <label className="block text-xs font-medium text-gray-600">App Version</label>
                                            <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} className="w-full px-3 py-1.5 border rounded text-sm mt-1" />
                                        </div>
                                        <div className="w-1/2">
                                            <label className="block text-xs font-medium text-gray-600">Splash Color</label>
                                            <input type="color" value={splashColor} onChange={(e) => setSplashColor(e.target.value)} className="w-full h-8 border rounded mt-1 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button onClick={startProcess} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 mt-4 shadow-lg transition">
                            <FaRocket /> Build Application
                        </button>
                    </div>
                )}

                {/* এই সেকশনটিতেই ম্যাজিক করা হয়েছে (building এবং error একসাথে) */}
                {(status === "building" || status === "error") && (
                    <div className="mt-2">
                        <div className="bg-gray-800 rounded-t-lg px-4 py-2 flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-mono">Build Console</span>
                            <div className="flex space-x-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><div className="w-3 h-3 rounded-full bg-yellow-500"></div><div className="w-3 h-3 rounded-full bg-green-500"></div></div>
                        </div>
                        <div className="bg-gray-900 text-green-400 font-mono text-xs p-4 h-48 overflow-y-auto rounded-b-lg text-left leading-relaxed shadow-inner">
                            {logs.map((log, i) => (
                                <div key={i} className={log.includes("[ERROR]") ? "text-red-500 font-bold mt-2" : "mt-1"}>
                                    {log}
                                </div>
                            ))}
                            <div ref={terminalEndRef} />
                        </div>
                        
                        {/* যদি এরর আসে, তবে এই বাটনটি দেখাবে */}
                        {status === "error" && (
                            <button onClick={() => { setStatus("idle"); setLogs([]); }} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg mt-4 shadow-lg transition">
                                Fix Error & Try Again
                            </button>
                        )}
                    </div>
                )}

                {status === "success" && (
                    <div className="text-center mt-4">
                        <h3 className="text-xl font-bold text-green-600 mb-2 flex justify-center items-center gap-2"><FaCheckCircle /> APK is Ready!</h3>
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-white rounded-xl shadow-md border inline-block">
                                <QRCodeCanvas value={downloadUrl} size={130} />
                            </div>
                        </div>
                        <button onClick={() => window.location.href = downloadUrl} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg mb-3 flex items-center justify-center gap-2">
                            <FaDownload /> Download APK
                        </button>
                        <button onClick={() => { setStatus("idle"); setLogs([]); setUrl(""); setAppName(""); }} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-lg">Create Another App</button>
                    </div>
                )}
            </div>
        </div>
    );
}
