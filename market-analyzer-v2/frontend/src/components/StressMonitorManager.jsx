import React, { useEffect } from 'react';
// CORRECT: Import useData from DataContext, not a non-existent useSocket
import { useData } from '../contexts/DataContext'; 

const StressMonitorManager = () => {
    // CORRECT: Destructure socket (and other data) from useData()
    const { socket, isConnected, stressHistory } = useData(); 

    useEffect(() => {
        // DEFENSIVE CHECK: Ensure socket is not null/undefined before using it
        if (!socket) {
            console.log("StressMonitorManager: Socket not yet initialized.");
            return;
        }

        console.log("StressMonitorManager: Socket is ready.");
        // This is where you would add any logic that involves the socket
        // directly, e.g., sending commands to the backend or setting up
        // custom listeners not handled by DataContext.

        // For now, it mainly ensures the socket is being consumed correctly.

        return () => {
            // Cleanup any custom event listeners if this component added them
        };
    }, [socket]); // Re-run this effect when the socket object changes (e.g., from null to an actual socket instance)

    // This component might not render much UI directly if its main role is logic.
    // It can render some status or debug info.
    return (
        <div className="text-gray-500 text-sm mt-2 mb-4">
            Stress Monitor Manager Status: {isConnected ? "Active" : "Inactive (Socket Disconnected)"}
            {/* You could add more UI elements or controls here if needed */}
        </div>
    );
};

export default StressMonitorManager;