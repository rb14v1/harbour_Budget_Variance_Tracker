import { adminApi } from '../../api/resources';
import ReferenceDataPage from './ReferenceDataPage';

export function DepartmentsPage() {
  return <ReferenceDataPage title="Departments" queryKey="departments" list={adminApi.departments} create={adminApi.createDepartment} update={adminApi.updateDepartment} />;
}

export function CategoriesPage() {
  return (
    <ReferenceDataPage
      title="Categories"
      queryKey="categories"
      list={adminApi.categories}
      create={adminApi.createCategory}
      update={adminApi.updateCategory}
      typeOptions={['OPEX', 'CAPEX']}
    />
  );
}
