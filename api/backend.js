


const { createClient } = require('@supabase/supabase-js');

// TODO: Yahan apni Supabase details daal (URL aur ANON KEY)
const supabaseUrl = 'https://xjsevqbyylfuncscwovv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqc2V2cWJ5eWxmdW5jc2N3b3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MjE1NjEsImV4cCI6MjA5NjE5NzU2MX0.1x-VnJZg0Eb-x4Bb9FkJhVHMZAmbZntGymyxraZkWpk';
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
    // Sirf POST request allow karenge
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const action = payload.action;
        const activeSchool = "VPS"; // Abhi default VPS rakh rahe hain SaaS ke liye

        // 1. FETCH EMPLOYEES & MASTER SETUP (Dono ek sath laayenge)
        if (!action || action === "getEmployees") {
            // Employees laao
            const { data: empData, error: empError } = await supabase
                .from('Employee_Data')
                .select('*')
                .order('id', { ascending: true });
            if (empError) throw empError;

            // Master Setup laao
            const { data: setupData, error: setupError } = await supabase
                .from('Master_Setup')
                .select('setup_data')
                .eq('school_code', activeSchool)
                .single(); // Sirf ek row aayegi is school ki

            let currentSetup = setupData ? setupData.setup_data : {};

            return res.status(200).json({ status: "Success", employees: empData, empSetup: currentSetup });
        }

        // 2. SAVE MASTER SETUP (Ye miss ho gaya tha!)
        if (action === "saveEmpSetup") {
            const { error } = await supabase
                .from('Master_Setup')
                .upsert({ school_code: activeSchool, setup_data: payload.data }); 
                // upsert ka matlab: Agar nahi hai to bana do, agar hai to update kar do
            
            if (error) throw error;
            return res.status(200).json({ status: "Success", message: "Setup Saved Successfully!" });
        }

        // 3. SAVE NEW EMPLOYEE
        if (action === "saveEmployee") {
            payload.data.Status = payload.data.Status || "Active";
            payload.data.school_code = payload.data.school_code || activeSchool; 

            const { error } = await supabase.from('Employee_Data').insert([payload.data]);
            if (error) throw error;
            return res.status(200).json({ status: "Success", message: "Employee Added Successfully!" });
        }

        // 4. UPDATE EMPLOYEE
        if (action === "updateEmployee") {
            const { error } = await supabase.from('Employee_Data').update(payload.data).eq('empId', payload.data.empId);
            if (error) throw error;
            return res.status(200).json({ status: "Success", message: "Employee Updated Successfully!" });
        }

        // 5. MARK INACTIVE
        if (action === "inactiveEmployee") {
            const { error } = await supabase.from('Employee_Data').update({ Status: 'Inactive', LeaveReason: payload.reason + " | " + payload.date }).eq('empId', payload.empId);
            if (error) throw error;
            return res.status(200).json({ status: "Success", message: "Employee Marked Inactive!" });
        }

        return res.status(400).json({ status: "Error", message: "Invalid Action" });

    } catch (error) {
        console.error("Backend Error:", error);
        return res.status(500).json({ status: "Error", message: error.message });
    }
};
