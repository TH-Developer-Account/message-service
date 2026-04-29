// Mock DB function — replace with your real DB call
export const getMachinesFromDB = async (phoneNumber) => {
  const mockDB = {
    "+918792426168": [
      { serialNumber: "SN-001", machineName: "Drilling Machine" },
      { serialNumber: "SN-002", machineName: "Lathe Machine" },
    ],
    "+911234567890": [{ serialNumber: "SN-003", machineName: "CNC Cutter" }],
  };
  return mockDB[phoneNumber] || null;
};
